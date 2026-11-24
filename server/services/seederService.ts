import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { config } from '../config.ts';
import { getDb } from '../infrastructure/db.ts';
import { hashPassword } from '../infrastructure/auth.ts';
import { ensureStorageRoot, processAndSaveProjectImage } from '../infrastructure/storage.ts';
import {
  ImageStage,
  ImageStageToInt,
  ProjectStatus,
  ProjectStatusToInt,
} from '../domain/types.ts';

const DEMO_IMAGE_FILES = {
  roofAfter: 'src/assets/images/project_roof_after_1795482424368.jpg',
  roofDuring: 'src/assets/images/project_roof_during_1795482429878.jpg',
  roofBefore: 'src/assets/images/project_roof_before_1795482425360.jpg',
  tankEpoxy: 'src/assets/images/project_tank_epoxy_1795482425960.jpg',
  warehouse: 'src/assets/images/project_industrial_warehouse_1795482425872.jpg',
};

export async function runSeeder(): Promise<void> {
  const db = getDb();
  ensureStorageRoot();
  const now = new Date().toISOString();

  // 1. Admin seed: ONLY when ADMIN_PASSWORD env var is explicitly provided
  if (config.adminSeed.password.length > 0) {
    const existingAdmin = db
      .prepare(`SELECT Id FROM AdminUsers WHERE Username = ? COLLATE NOCASE`)
      .get(config.adminSeed.username) as { Id: string } | undefined;

    const hash = hashPassword(config.adminSeed.password);
    if (!existingAdmin) {
      db.prepare(
        `INSERT INTO AdminUsers (Id, Username, FullName, PasswordHash, FailedLoginAttempts, LockoutEndUtc, CreatedAt, UpdatedAt)
         VALUES (?, ?, ?, ?, 0, NULL, ?, ?)`,
      ).run(
        crypto.randomUUID(),
        config.adminSeed.username,
        config.adminSeed.fullName,
        hash,
        now,
        now,
      );
    } else {
      // Configured env password always overrides any claimed fallback hash
      db.prepare(`UPDATE AdminUsers SET PasswordHash = ?, UpdatedAt = ? WHERE Id = ?`).run(
        hash,
        now,
        existingAdmin.Id,
      );
    }
  }

  // 2. SiteSettings (Id = 1)
  const existingSettings = db.prepare(`SELECT Id FROM SiteSettings WHERE Id = 1`).get();
  if (!existingSettings) {
    db.prepare(
      `INSERT INTO SiteSettings (
         Id, SiteName, HeroTitle, HeroSubtitle, AboutTitle, AboutText,
         Phone, WhatsAppNumber, Email, Address, WorkingHours,
         FacebookUrl, InstagramUrl, XUrl, YouTubeUrl, NotificationEmail, UpdatedAt
       ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?)`,
    ).run(
      'MANEE | مَنيع',
      'أنظمة عزل هندسية تحمي منشآتك لعقود قادمة',
      'ننفّذ أعمال العزل المائي والحراري والصوتي للأسطح والخزانات والمباني الصناعية والتجارية بأعلى المواصفات المعتمدة وبضمان حقيقي ممتد.',
      'خبرة ميدانية وهندسية متخصصة في حماية المباني',
      'تأسست مَنيع لتقديم حلول عزل متكاملة تبدأ بالفحص الهندسي الدقيق وتحديد نقاط الضعف الحراري والمائي، مروراً باختيار أنظمة العزل الأنسب لطبيعة المنشأة والمناخ، وانتهاءً بالتنفيذ الميداني المنضبط واختبارات الغمر والجودة قبل التسليم النهائي.',
      '+966 55 412 8900',
      '+966 55 412 8900',
      'projects@manee-insulation.sa',
      'الرياض — طريق الملك فهد، الحي الهندسي التجاري',
      'السبت – الخميس: 8:00 صباحاً – 6:00 مساءً',
      now,
    );
  }

  // 3. Default Categories (SOP Section 10: سكني، تجاري، صناعي، خزانات)
  const catCount = (db.prepare(`SELECT COUNT(*) AS cnt FROM Categories`).get() as { cnt: number }).cnt;
  if (catCount === 0) {
    const insertCat = db.prepare(
      `INSERT INTO Categories (Name, DisplayOrder, IsActive, CreatedAt, UpdatedAt) VALUES (?, ?, 1, ?, ?)`,
    );
    const defaultCats = [
      { name: 'سكني', order: 1 },
      { name: 'تجاري', order: 2 },
      { name: 'صناعي', order: 3 },
      { name: 'خزانات', order: 4 },
    ];
    for (const c of defaultCats) {
      insertCat.run(c.name, c.order, now, now);
    }
  }

  // 4. Default Services (SOP Section 10: 6 core insulation services)
  const svcCount = (db.prepare(`SELECT COUNT(*) AS cnt FROM Services`).get() as { cnt: number }).cnt;
  if (svcCount === 0) {
    const insertSvc = db.prepare(
      `INSERT INTO Services (Name, Slug, ShortDescription, Description, DisplayOrder, IsActive, CreatedAt, UpdatedAt)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    );
    const defaultServices = [
      {
        name: 'عزل مائي',
        slug: 'waterproofing',
        short: 'حماية شاملة للهياكل الخرسانية والأسطح والأساسات من تسربات المياه والرطوبة والأمطار.',
        desc: 'نطبّق أنظمة عزل مائي متعددة الطبقات تشمل اللفائف البيتومينية المعدّلة بالبوليمر (SBS/APP)، والعزل الإسمنتي البلوري، والطلاءات الإلاستومرية المرنة، مع معالجة دقيقة لفواصل التمدد ومناطق التصريف واختبار الغمر المائي لمدة 72 ساعة.',
        order: 1,
      },
      {
        name: 'عزل حراري',
        slug: 'thermal-insulation',
        short: 'خفض الأحمال الحرارية واستهلاك التكييف حتى 40% عبر أنظمة فوم وبوليسترين عالية الكثافة.',
        desc: 'نوفر حلول عزل حراري مطابقة لكود البناء باستخدام فوم البولي يوريثان ذي الخلايا المغلقة وألواح البوليسترين المبثوق (XPS)، مما يحقق استقراراً حرارياً داخلياً ويحمي الهيكل الخرساني من الإجهاد الحراري والتشققات.',
        order: 2,
      },
      {
        name: 'عزل صوتي',
        slug: 'acoustic-insulation',
        short: 'تقليل الضوضاء وانتقال الصوت في المرافق التجارية والمستودعات والمباني السكنية.',
        desc: 'تركيب ألواح الصوف الصخري عالي الكثافة وحواجز الامتصاص الصوتي للأسقف والجدران الفاصلة وغرف المعدات الميكانيكية لتحقيق بيئة هادئة ومعزولة وفق المعايير الهندسية.',
        order: 3,
      },
      {
        name: 'عزل الأسطح',
        slug: 'roof-insulation',
        short: 'أنظمة عزل مائي وحراري مدمجة للأسطح المبلطة وغير المبلطة والأسطح المعدنية.',
        desc: 'ننفذ منظومة عزل الأسطح الكاملة بدءاً من تنظيف ومعالجة الخرسانة وميول تصريف الأمطار، ثم تطبيق طبقات الفوم أو الرولات العازلة، يليها طلاء الأكريليك العاكس لأشعة الشمس فوق البنفسجية لرفع العمر الافتراضي للسطح.',
        order: 4,
      },
      {
        name: 'عزل الخزانات',
        slug: 'water-tank-insulation',
        short: 'تبطين وعزل خزانات المياه الخرسانية الأرضية والعلوية بمواد إيبوكسية غذائية معتمدة.',
        desc: 'عزل داخلي وخارجي متكامل لخزانات مياه الشرب باستخدام الإيبوكسي الخالي من المذيبات المعتمد صحياً والعزل الإسمنتي المقاوم للضغط السلبي والإيجابي لمنع أي تسرب أو تلوث للمياه.',
        order: 5,
      },
      {
        name: 'معالجة تسربات المياه',
        slug: 'leak-repair',
        short: 'كشف هندسي دقيق ومعالجة جذرية لتسربات الأسقف والخزانات والأساسات دون تكسير عشوائي.',
        desc: 'استخدام أجهزة الكشف الحراري والصوتي لتحديد مسارات التسرب، ومعالجة التشققات الإنشائية بحقن راتنجات البولي يوريثان والإيبوكسي المتمدد لإيقاف التسرب بشكل نهائي واستعادة سلامة الخرسانة.',
        order: 6,
      },
    ];
    for (const s of defaultServices) {
      insertSvc.run(s.name, s.slug, s.short, s.desc, s.order, now, now);
    }
  }

  // Sample portfolio content is only for local development and must not go live.
  if (config.isProduction) return;

  // 5. Materials & 4 Demo Projects (per user's explicit Phase 1 confirmation)
  const projCount = (db.prepare(`SELECT COUNT(*) AS cnt FROM Projects`).get() as { cnt: number }).cnt;
  if (projCount === 0) {
    const matCount = (db.prepare(`SELECT COUNT(*) AS cnt FROM Materials`).get() as { cnt: number }).cnt;
    if (matCount === 0) {
      const insertMat = db.prepare(
        `INSERT INTO Materials (Name, IsActive, CreatedAt, UpdatedAt) VALUES (?, 1, ?, ?)`,
      );
      const demoMaterials = [
        'فوم بولي يوريثان مغلق الخلايا',
        'لفائف بيتومين معدّل SBS',
        'إيبوكسي غذائي خالي من المذيبات',
        'طلاء أكريليك عاكس للأشعة UV',
        'صوف صخري عالي الكثافة',
        'عزل إسمنتي مرن ثنائي المركب',
      ];
      for (const m of demoMaterials) {
        insertMat.run(m, now, now);
      }
    }

    const getCatId = (name: string) =>
      (db.prepare(`SELECT Id FROM Categories WHERE Name = ?`).get(name) as { Id: number }).Id;
    const getSvcId = (name: string) =>
      (db.prepare(`SELECT Id FROM Services WHERE Name = ?`).get(name) as { Id: number }).Id;
    const getMatId = (name: string) =>
      (db.prepare(`SELECT Id FROM Materials WHERE Name = ?`).get(name) as { Id: number }).Id;

    const demoProjects = [
      {
        title: 'العزل المائي والحراري المتكامل لسطح برج المدار التجاري',
        slug: 'almadar-tower-roof-insulation',
        shortDescription:
          'إعادة تأهيل وعزل سطح تجاري بمساحة 3,400 م² بنظام الفوم المغلق وطلاء الأكريليك العاكس مع معالجة فواصل التمدد.',
        description:
          'شمل المشروع معالجة شاملة للسطح الخرساني الرئيسي بعد رصد تشققات حرارية وتجمعات رطوبة حول مناطق التصريف. بدأ الفريق بتنظيف الخرسانة ميكانيكياً وفتح الشقوق وحقنها بمواد إسمنتية غير قابلة للانكماش، تلا ذلك رش طبقة فوم بولي يوريثان بكثافة 45 كجم/م³ وسماكة 5 سم لتوفير عزل مائي وحراري متجانس بلا فواصل، ثم طبقتين من الأكريليك الإلاستومري الأبيض العاكس للحرارة مع اختبار غمر كامل لمدة 72 ساعة قبل التسليم.',
        category: 'تجاري',
        status: ProjectStatus.Completed,
        isPublished: 1,
        isFeatured: 1,
        city: 'الرياض',
        executionDate: '2026-08-18',
        area: 3400,
        duration: 18,
        clientName: 'مجموعة المدار للاستثمار العقاري',
        order: 1,
        services: ['عزل الأسطح', 'عزل مائي', 'عزل حراري'],
        materials: ['فوم بولي يوريثان مغلق الخلايا', 'طلاء أكريليك عاكس للأشعة UV'],
        images: [
          {
            file: DEMO_IMAGE_FILES.roofAfter,
            stage: ImageStage.After,
            alt: 'السطح التجاري بعد اكتمال العزل المائي وطلاء الحماية العاكس',
            isCover: true,
          },
          {
            file: DEMO_IMAGE_FILES.roofDuring,
            stage: ImageStage.During,
            alt: 'أثناء فرد اللفائف البيتومينية وتطبيق طبقات العزل الميداني',
            isCover: false,
          },
          {
            file: DEMO_IMAGE_FILES.roofBefore,
            stage: ImageStage.Before,
            alt: 'فحص التشققات الحرارية والرطوبة في البلاطة الخرسانية قبل المعالجة',
            isCover: false,
          },
        ],
      },
      {
        title: 'تبطين وعزل خزان مياه خرساني أرضي بسعة 850 م³',
        slug: 'underground-water-tank-epoxy',
        shortDescription:
          'عزل داخلي وخارجي لخزان مياه شرب مركزي بالإيبوكسي الغذائي المعتمد والعزل الإسمنتي المقاوم للضغط.',
        description:
          'نُفّذ المشروع لمعالجة رطوبة الجدران الجانبية وتأمين خزان مياه الشرب الرئيسي لمجمع سكني وتجاري. تم جلي الجدران والأرضية بالصنفرة الميكانيكية ومعالجة فواصل الصب بشرائط مانعة للتسرب، ثم تطبيق طبقتين من العزل الإسمنتي المرن ثنائي المركب، تلتها ثلاث طبقات من طلاء الإيبوكسي الغذائي الخالي من المذيبات باللون الأزرق الفاتح لتحقيق سطح أملس مقاوم للبكتيريا والطحالب ومعتمد لمياه الشرب.',
        category: 'خزانات',
        status: ProjectStatus.Completed,
        isPublished: 1,
        isFeatured: 1,
        city: 'جدة',
        executionDate: '2026-06-10',
        area: 920,
        duration: 11,
        clientName: 'شركة روافد لتطوير المجمعات',
        order: 2,
        services: ['عزل الخزانات', 'عزل مائي', 'معالجة تسربات المياه'],
        materials: ['إيبوكسي غذائي خالي من المذيبات', 'عزل إسمنتي مرن ثنائي المركب'],
        images: [
          {
            file: DEMO_IMAGE_FILES.tankEpoxy,
            stage: ImageStage.After,
            alt: 'الخزان الخرساني الأرضي بعد التبطين النهائي بالإيبوكسي الغذائي',
            isCover: true,
          },
          {
            file: DEMO_IMAGE_FILES.roofBefore,
            stage: ImageStage.Before,
            alt: 'حالة الخرسانة وفواصل الصب قبل أعمال التجهيز والمعالجة',
            isCover: false,
          },
          {
            file: DEMO_IMAGE_FILES.roofDuring,
            stage: ImageStage.During,
            alt: 'أثناء تنفيذ طبقات العزل التأسيسية ومعالجة الزوايا',
            isCover: false,
          },
        ],
      },
      {
        title: 'العزل الحراري والصوتي لمركز الإمداد اللوجستي بالدمام',
        slug: 'dammam-logistics-warehouse-insulation',
        shortDescription:
          'تجهيز مستودع صناعي بمساحة 6,800 م² بنظام عزل حراري وصوتي متكامل للأسقف المعدنية والجدران.',
        description:
          'مشروع عزل صناعي عالي الكفاءة يهدف إلى خفض درجة الحرارة الداخلية في مستودعات التخزين المبرد والجاف وتقليل الصدى والضوضاء الصناعية. تم تركيب ألواح الصوف الصخري عالي الكثافة على الجدران الجانبية وتغليف الهيكل المعدني للأسقف بطبقة فوم بولي يوريثان مغلق الخلايا مع معالجة جميع نقاط التثبيت والبراغي بمواد مانعة للتسرب لضمان إحكام حراري ومائي كامل.',
        category: 'صناعي',
        status: ProjectStatus.Completed,
        isPublished: 1,
        isFeatured: 1,
        city: 'الدمام',
        executionDate: '2026-04-22',
        area: 6800,
        duration: 24,
        clientName: 'شركة الخليج للخدمات اللوجستية',
        order: 3,
        services: ['عزل حراري', 'عزل صوتي', 'عزل الأسطح'],
        materials: ['صوف صخري عالي الكثافة', 'فوم بولي يوريثان مغلق الخلايا'],
        images: [
          {
            file: DEMO_IMAGE_FILES.warehouse,
            stage: ImageStage.After,
            alt: 'المستودع اللوجستي بعد اكتمال ألواح العزل الحراري والصوتي للأسقف والجدران',
            isCover: true,
          },
          {
            file: DEMO_IMAGE_FILES.roofDuring,
            stage: ImageStage.During,
            alt: 'مراحل تثبيت وتجهيز أنظمة العزل في الموقع',
            isCover: false,
          },
        ],
      },
      {
        title: 'معالجة تسربات وعزل أسطح مجمع فلل النرجس السكني',
        slug: 'narjis-residential-villas-waterproofing',
        shortDescription:
          'تنفيذ نظام اللفائف البيتومينية المعدّلة SBS وعزل حراري لـ 12 فيلا سكنية مع ضمان 15 عاماً.',
        description:
          'تنفيذ أعمال العزل المائي المزدوج باستخدام لفائف البيتومين المعدّل SBS بسماكة 4 مم مع طبقة تأسيسية (برايمر) بيتوميني وحماية نهائية بالخرسانة الرغوية للميول. تم اختبار جميع الأسطح والملحقات العلوية ومناطق التكييف بالماء للتأكد من عدم وجود أي تسرب قبل تسليم الوحدات.',
        category: 'سكني',
        status: ProjectStatus.InProgress,
        isPublished: 1,
        isFeatured: 0,
        city: 'الرياض',
        executionDate: '2026-10-05',
        area: 2150,
        duration: 14,
        clientName: 'تطوير مساكن النرجس الخاصة',
        order: 4,
        services: ['عزل الأسطح', 'عزل مائي', 'معالجة تسربات المياه'],
        materials: ['لفائف بيتومين معدّل SBS', 'عزل إسمنتي مرن ثنائي المركب'],
        images: [
          {
            file: DEMO_IMAGE_FILES.roofDuring,
            stage: ImageStage.During,
            alt: 'فرد ولحام لفائف البيتومين المعدّل SBS على أسطح الفلل',
            isCover: true,
          },
          {
            file: DEMO_IMAGE_FILES.roofBefore,
            stage: ImageStage.Before,
            alt: 'معاينة البلاطة الخرسانية قبل أعمال التأسيس والعزل',
            isCover: false,
          },
          {
            file: DEMO_IMAGE_FILES.roofAfter,
            stage: ImageStage.After,
            alt: 'الطبقة النهائية الواقية للأسطح بعد الإغلاق والاختبار',
            isCover: false,
          },
        ],
      },
    ];

    for (const p of demoProjects) {
      const catId = getCatId(p.category);
      const res = db
        .prepare(
          `INSERT INTO Projects (
             Title, Slug, ShortDescription, Description, CategoryId, Status,
             IsPublished, IsFeatured, City, ExecutionDate, AreaInSquareMeters,
             DurationInDays, ClientName, DisplayOrder, RowVersion, IsDeleted, CreatedAt, UpdatedAt
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`,
        )
        .run(
          p.title,
          p.slug,
          p.shortDescription,
          p.description,
          catId,
          ProjectStatusToInt[p.status],
          p.isPublished,
          p.isFeatured,
          p.city,
          p.executionDate,
          p.area,
          p.duration,
          p.clientName,
          p.order,
          now,
          now,
        );

      const projectId = Number(res.lastInsertRowid);

      const insertSvc = db.prepare(
        `INSERT OR IGNORE INTO ProjectServices (ProjectId, ServiceId) VALUES (?, ?)`,
      );
      for (const sName of p.services) {
        insertSvc.run(projectId, getSvcId(sName));
      }

      const insertMat = db.prepare(
        `INSERT OR IGNORE INTO ProjectMaterials (ProjectId, MaterialId) VALUES (?, ?)`,
      );
      for (const mName of p.materials) {
        insertMat.run(projectId, getMatId(mName));
      }

      // Process demo images through the real Sharp storage pipeline into /data/uploads/projects/{id}/
      let imgOrder = 0;
      for (const imgSpec of p.images) {
        const sourcePath = path.resolve(process.cwd(), imgSpec.file);
        if (!fs.existsSync(sourcePath)) continue;
        const buf = fs.readFileSync(sourcePath);
        const processed = await processAndSaveProjectImage(
          projectId,
          buf,
          path.basename(sourcePath),
        );
        db.prepare(
          `INSERT INTO ProjectImages (
             ProjectId, FilePath, ThumbnailPath, OriginalFileName, ContentType,
             SizeInBytes, Width, Height, AltText, Stage, DisplayOrder, IsCover, CreatedAt
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          projectId,
          processed.filePath,
          processed.thumbnailPath,
          processed.originalFileName,
          processed.contentType,
          processed.sizeInBytes,
          processed.width,
          processed.height,
          imgSpec.alt,
          ImageStageToInt[imgSpec.stage],
          imgOrder++,
          imgSpec.isCover ? 1 : 0,
          now,
        );
      }
    }
  }
}
