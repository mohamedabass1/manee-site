# SOP: بناء Backend لموقع معرض أعمال مقاول عزل

نسخة 1.0 · وثيقة مرجعية موجّهة إلى أداة ذكاء اصطناعي منفّذة (AI Coding Tool)

## 0. تعليمات للمنفّذ (اقرأ هذا القسم أولاً)

أنت مطوّر Backend أول. مهمتك بناء **ASP.NET Core Web API** وفق هذه الوثيقة حرفياً. القواعد:

1. **لا تخمّن.** إن وجدت غموضاً أو تعارضاً، توقّف واطرح السؤال بوضوح بدل الافتراض. ما هو مكتوب هنا هو القرار النهائي.
2. **لا تضف ميزات** غير مذكورة (لا Refresh Token، لا أدوار متعددة، لا تسجيل عام، لا دفع إلكتروني، لا تعدد لغات).
3. **نفّذ على مراحل** حسب القسم 19. بعد كل مرحلة: ابنِ المشروع (`dotnet build`) بلا أخطاء ولا تحذيرات مهمة، شغّل الاختبارات، ثم اعرض ملخصاً بما أُنجز وانتظر الموافقة قبل المرحلة التالية.
4. **التسمية:** كل المعرّفات في الكود (Classes, Properties, Routes, Columns) بالإنجليزية. **رسائل الأخطاء والتحقق الموجّهة للمستخدم بالعربية.** JSON بنمط camelCase.
5. **لا أسرار في الكود** أو في الملفات المرفوعة للمستودع (كلمات المرور، مفاتيح JWT، بيانات SMTP) — فقط عبر User Secrets / متغيرات البيئة.
6. استخدم أحدث إصدارات مستقرة متوافقة مع **.NET 10 LTS** لكل الحزم، وتحقق من التوافق قبل التثبيت.
7. اكتب كوداً نظيفاً: Async/await في كل العمليات I/O، `CancellationToken` في كل الـ endpoints والخدمات، Nullable Reference Types مفعّلة، `ImplicitUsings` حسب الحاجة.

## 1. نظرة عامة والنطاق

**المنتج:** نظام لمقاول عزل (مائي، حراري، صوتي، أسطح، خزانات، معالجة تسربات). الـ Backend مستقل عن الواجهة، ويخدم:

- **واجهة عامة (Public)** بلا تسجيل دخول: الخدمات، معرض المشاريع، تفاصيل المشروع، معلومات التواصل، إرسال استفسار.
- **لوحة تحكم (Admin)** لمستخدم واحد: إدارة المشاريع والصور والتصنيفات والخدمات والمواد ورسائل العملاء وإعدادات الموقع.

**ضمن النطاق (In Scope):** كل ما ورد في هذه الوثيقة.

**خارج النطاق (Out of Scope) في الإصدار 1:**

- بناء أي واجهة أمامية (Frontend).
- تعدد اللغات (الموقع عربي فقط).
- مستخدمون متعددون، أدوار، صلاحيات، تسجيل عام، Refresh Token، OAuth.
- التخزين السحابي (الملفات تُخزَّن محلياً على السيرفر).
- حذف مسترجَع (Restore) للمشاريع المحذوفة.
- مواصفات تقنية للمواد (المواد أسماء فقط).

## 2. القرارات المعتمدة (ملزمة)

| الموضوع | القرار |
| --- | --- |
| اللغة | عربي فقط، حقول مفردة (`Title`, `Description`) |
| المواد | اسم فقط (`Name`, `IsActive`) |
| إشعار البريد | نعم، عند وصول رسالة جديدة، **بشكل غير متزامن** (Background) |
| الـ Slug | لاتيني اختياري يُدخله الأدمن؛ الرابط العام `{id}-{slug}`؛ البحث يتم بالـ Id فقط |
| الخدمة مقابل التصنيف | **الخدمة** = ما يقدمه المقاول (عزل مائي…). **التصنيف** = نوع المنشأة (سكني، تجاري، صناعي، خزانات) |
| مراحل التنفيذ | حقل `Stage` في الصورة (عام / قبل / أثناء / بعد) |
| حالة المشروع | `Planned / InProgress / Completed` + حقل مستقل `IsPublished` للظهور |
| الحذف | Soft Delete للمشاريع فقط. باقي الكيانات حذف فعلي مع منع الحذف إن كانت مرتبطة (409) |
| إعدادات الموقع | جدول بصف واحد `SiteSettings` (Id = 1) |
| رسائل العملاء | تُحفظ مع الاسم والهاتف والبريد (اختياري) وحالة (جديدة / مقروءة / تمت المعالجة) |
| المصادقة | ASP.NET Core Identity + JWT (Access Token فقط)، أدمن واحد، Username + Password |
| الأنماط | Clean Architecture، خدمات تطبيقية عادية (**بدون MediatR**)، Mapping يدوي (**بدون AutoMapper**) |

## 3. التقنيات والحزم

- C# / **.NET 10 LTS** / ASP.NET Core Web API (Controllers وليس Minimal APIs).
- **SQL Server** + **EF Core** (Code First + Migrations).
- **ASP.NET Core Identity** + **JWT Bearer** (`Microsoft.AspNetCore.Authentication.JwtBearer`).
- **FluentValidation** للتحقق من المدخلات.
- **Swagger / OpenAPI**: `Microsoft.AspNetCore.OpenApi` مع واجهة Swagger UI (Swashbuckle أو بديل متوافق مع .NET 10؛ تحقق من التوافق)، مع دعم زر Authorize لـ Bearer.
- **معالجة الصور:** `SixLabors.ImageSharp` (انتبه لترخيصه التجاري، وأبلغ صاحب المشروع به؛ البديل المقبول: `SkiaSharp`).
- **البريد:** `MailKit` (SMTP).
- **السجلات:** `Serilog` (Console + ملف يومي Rolling).
- **Rate Limiting:** مدمج في ASP.NET Core (`Microsoft.AspNetCore.RateLimiting`).
- **API Versioning:** `Asp.Versioning.Mvc` (المسار `/api/v1/...`).
- **الاختبارات:** xUnit + FluentAssertions + `Microsoft.AspNetCore.Mvc.Testing` (+ Testcontainers لـ SQL Server إن توفر Docker، وإلا LocalDB).

## 4. بنية الحل (Clean Architecture)

```
InsulationPortfolio.sln
src/
  InsulationPortfolio.Domain/
    Entities/  Enums/  Common/
  InsulationPortfolio.Application/
    Abstractions/   (IAppDbContext, IFileStorage, IEmailSender, IImageProcessor, ITokenService, IEmailQueue...)
    Services/       (ProjectService, ImageService, ...)
    DTOs/           (Requests, Responses)
    Validators/
    Exceptions/     (NotFoundException, ConflictException, ...)
    Common/         (PagedResult<T>, SlugHelper)
    DependencyInjection.cs
  InsulationPortfolio.Infrastructure/
    Persistence/    (AppDbContext, Configurations/, Migrations/, Seed/)
    Identity/       (ApplicationUser, TokenService)
    Storage/        (LocalFileStorage, ImageSharpProcessor)
    Email/          (SmtpEmailSender, EmailQueue, EmailBackgroundService)
    DependencyInjection.cs
  InsulationPortfolio.Api/
    Controllers/Public/  Controllers/Admin/
    Middleware/  Extensions/  Program.cs
tests/
  InsulationPortfolio.UnitTests/
  InsulationPortfolio.IntegrationTests/
```

**قواعد الاعتماد (إلزامية):**

- `Domain` لا يعتمد على أي مشروع أو حزمة خارجية.
- `Application` يعتمد على `Domain` فقط. يعرّف الواجهات (Interfaces) ولا ينفّذها.
- `Infrastructure` يعتمد على `Application` و`Domain` وينفّذ الواجهات.
- `Api` يعتمد على `Application` و`Infrastructure` (للتسجيل في DI فقط).
- `ApplicationUser` يكون في `Infrastructure` (لأنه يرث `IdentityUser`) كي يبقى الـ Domain نظيفاً.
- الـ Controllers **رفيعة**: تستقبل، تستدعي Service، تُرجع النتيجة. لا منطق أعمال فيها، ولا وصول مباشر لـ DbContext.
- لا تُعاد كيانات (Entities) من الـ API أبداً؛ فقط DTOs.

## 5. نموذج البيانات (Entities)

قواعد عامة: المفاتيح `int` Identity (عدا Identity نفسه). كل التواريخ `DateTime` بتوقيت **UTC** ونوع العمود `datetime2`. النصوص `nvarchar`. كل الكيانات التي لها تعديل تحمل `CreatedAt` و`UpdatedAt` (يُضبطان تلقائياً عبر `SaveChanges` override).

### 5.1 `Project` (الكيان الأساسي)

| الحقل | النوع | القيود |
| --- | --- | --- |
| Id | int | PK |
| Title | string(200) | مطلوب |
| Slug | string(200)? | لاتيني صغير بشرطات فقط، اختياري |
| ShortDescription | string(500) | مطلوب |
| Description | string (nvarchar(max)) | مطلوب |
| CategoryId | int | FK → Categories، مطلوب |
| Status | ProjectStatus | مطلوب |
| IsPublished | bool | الافتراضي false |
| IsFeatured | bool | الافتراضي false (للصفحة الرئيسية) |
| City | string(100)? | اختياري |
| ExecutionDate | DateOnly? | تاريخ التنفيذ، اختياري |
| AreaInSquareMeters | decimal(10,2)? | > 0 إن وُجد |
| DurationInDays | int? | > 0 إن وُجد |
| ClientName | string(150)? | **داخلي فقط، لا يظهر أبداً في الـ Public API** |
| DisplayOrder | int | الافتراضي 0 |
| IsDeleted | bool | الافتراضي false (Soft Delete) |
| DeletedAt | DateTime? |  |
| CreatedAt / UpdatedAt | DateTime |  |

العلاقات: `Category` (N:1)، `Images` (1:N)، `Services` (N:M عبر `ProjectService`)، `Materials` (N:M عبر `ProjectMaterial`).

### 5.2 `ProjectImage`

| الحقل | النوع | القيود |
| --- | --- | --- |
| Id | int | PK |
| ProjectId | int | FK، Cascade Delete |
| FilePath | string(500) | مسار نسبي، مثال `projects/12/3f2a….jpg` |
| ThumbnailPath | string(500) | مسار نسبي للمصغّرة |
| OriginalFileName | string(260) | للعرض فقط (يُنظَّف) |
| ContentType | string(50) | `image/jpeg` أو `image/png` أو `image/webp` |
| SizeInBytes | long | حجم الملف بعد المعالجة |
| Width / Height | int | أبعاد الصورة بعد المعالجة |
| AltText | string(250)? | الوصف البديل |
| Stage | ImageStage | الافتراضي `General` |
| DisplayOrder | int | الترتيب داخل المشروع |
| IsCover | bool | صورة الغلاف |
| CreatedAt | DateTime |  |

**قيد فريد مفلتر:** فهرس فريد على `ProjectId` حيث `IsCover = 1` (صورة غلاف واحدة كحد أقصى لكل مشروع).

### 5.3 `Category` (نوع المنشأة)

الحقول: `Id`, `Name` (100، مطلوب، فريد)، `DisplayOrder`, `IsActive` (الافتراضي true)، `CreatedAt`, `UpdatedAt`.

### 5.4 `Service` (الخدمة)

الحقول: `Id`, `Name` (150، مطلوب، فريد)، `Slug` (200؟)، `ShortDescription` (500، مطلوب)، `Description` (max، اختياري)، `DisplayOrder`, `IsActive` (الافتراضي true)، `CreatedAt`, `UpdatedAt`.

### 5.5 `Material` (مادة العزل/البناء)

الحقول: `Id`, `Name` (150، مطلوب، فريد)، `IsActive` (الافتراضي true)، `CreatedAt`, `UpdatedAt`. **أسماء فقط، لا حقول أخرى.**

### 5.6 جداول الربط

- `ProjectService`: مفتاح مركّب (`ProjectId`, `ServiceId`).
- `ProjectMaterial`: مفتاح مركّب (`ProjectId`, `MaterialId`).

### 5.7 `ContactMessage`

| الحقل | النوع | القيود |
| --- | --- | --- |
| Id | int | PK |
| FullName | string(100) | مطلوب |
| Phone | string(30) | مطلوب |
| Email | string(150)? | اختياري، بصيغة بريد صحيحة إن وُجد |
| Subject | string(150)? | اختياري |
| Message | string(2000) | مطلوب، 10 أحرف على الأقل |
| Status | MessageStatus | الافتراضي `New` |
| NotificationStatus | EmailNotificationStatus | الافتراضي `Pending` |
| IpAddress | string(45)? |  |
| CreatedAt | DateTime |  |
| ReadAt | DateTime? |  |

### 5.8 `SiteSettings` (صف واحد، Id = 1)

`SiteName` (150)، `HeroTitle` (200؟)، `HeroSubtitle` (400؟)، `AboutTitle` (200؟)، `AboutText` (max؟)، `Phone` (30؟)، `WhatsAppNumber` (30؟)، `Email` (150؟)، `Address` (300؟)، `WorkingHours` (200؟)، `FacebookUrl`, `InstagramUrl`, `XUrl`, `YouTubeUrl` (كلها 300؟ وبصيغة URL صحيحة)، **`NotificationEmail`** (150؟، بريد المقاول الذي تصله إشعارات الرسائل)، `UpdatedAt`.

### 5.9 `ApplicationUser` (في Infrastructure)

يرث `IdentityUser` (مفتاح string). حقل إضافي واحد: `FullName` (100؟). لا Roles في الإصدار 1.

## 6. إعدادات EF Core والفهارس

- كل كيان له `IEntityTypeConfiguration<T>` في ملف مستقل داخل `Persistence/Configurations`. ممنوع استخدام Data Annotations على كيانات الـ Domain.
- **Global Query Filter** على `Project`: `!IsDeleted`. في الإدارة، استخدم `IgnoreQueryFilters()` فقط إن لزم صراحةً.
- فهارس مطلوبة: `Projects(IsPublished, IsDeleted, DisplayOrder)`، `Projects(CategoryId)`، `ProjectImages(ProjectId, DisplayOrder)`، فريد على `Categories.Name` و`Services.Name` و`Materials.Name`، `ContactMessages(Status, CreatedAt)`.
- حذف `Category` أو `Service` أو `Material`: `DeleteBehavior.Restrict` (يمنع الحذف عند وجود ارتباط).
- ضبط `SiteSettings.Id` بدون Identity وبقيمة ثابتة 1.
- التعامل مع التزامن: `RowVersion` (`byte[]` + `IsRowVersion`) على `Project` فقط، وعند `DbUpdateConcurrencyException` تُرجع 409 برسالة عربية.
- استعلامات القراءة: `AsNoTracking()` + `Select` إلى DTO مباشرةً، وتجنّب N+1 (استخدم `AsSplitQuery` عند تحميل مجموعات متعددة).

## 7. التعدادات (Enums)

تُخزَّن كـ `int` في القاعدة، وتُرجَع في JSON كـ **نص** (`JsonStringEnumConverter`).

| Enum | القيم |
| --- | --- |
| ProjectStatus | `Planned`=0، `InProgress`=1، `Completed`=2 |
| ImageStage | `General`=0، `Before`=1، `During`=2، `After`=3 |
| MessageStatus | `New`=0، `Read`=1، `Handled`=2 |
| EmailNotificationStatus | `Pending`=0، `Sent`=1، `Failed`=2 |

## 8. قواعد الـ Slug والروابط

- `Slug` يُدخله الأدمن اختيارياً: أحرف لاتينية صغيرة وأرقام وشرطات فقط (Regex: `^[a-z0-9]+(?:-[a-z0-9]+)*$`)، حتى 200 حرف.
- إن لم يُدخل، يبقى `null` والرابط العام يُبنى من الـ Id فقط.
- الـ API **يبحث بالـ Id فقط**. الـ Slug للتجميل وSEO، وتغييره لا يكسر الروابط.
- يُرجع الـ Public API حقل `urlSegment` جاهزاً: `"12-roof-insulation"` أو `"12"` إن لم يوجد Slug.
- عند طلب `GET /projects/{id}` يكون `{id}` رقماً فقط. الواجهة الأمامية هي التي تستخرج الرقم من `urlSegment`.
- ينطبق الأمر نفسه على `Service`. أما `Category` و`Material` فلا Slug لهما.

## 9. تصميم الـ API

**قواعد عامة:** المسار الأساسي `/api/v1`. الاستجابات JSON. التواريخ بصيغة ISO 8601 UTC. الأخطاء بنمط ProblemDetails (القسم 15). كل مسارات `/admin/*` و`/auth/change-password` تتطلب `[Authorize]`.

### 9.1 المصادقة

| الطريقة | المسار | الوصف |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | Body: `{ username, password }` ← `200 { accessToken, expiresAtUtc }`. بيانات خاطئة ← 401 برسالة موحدة لا تكشف أي الحقلين خطأ. حساب مقفل ← 423 مع رسالة عربية |
| POST | `/api/v1/auth/change-password` | (مصادَق) `{ currentPassword, newPassword }` ← 204 |
| GET | `/api/v1/auth/me` | (مصادَق) `{ username, fullName }` للتحقق من صلاحية الجلسة |

### 9.2 الواجهة العامة (بلا مصادقة)

| الطريقة | المسار | الوصف |
| --- | --- | --- |
| GET | `/api/v1/public/site-settings` | الإعدادات العامة (بدون `NotificationEmail`) |
| GET | `/api/v1/public/services` | الخدمات الفعّالة مرتبة حسب `DisplayOrder` |
| GET | `/api/v1/public/services/{id}` | تفاصيل خدمة فعّالة، وإلا 404 |
| GET | `/api/v1/public/categories` | التصنيفات الفعّالة |
| GET | `/api/v1/public/materials` | المواد الفعّالة |
| GET | `/api/v1/public/projects` | قائمة مرقّمة (Pagination) وفلاتر. القسم 9.4 |
| GET | `/api/v1/public/projects/{id}` | تفاصيل مشروع منشور فقط، وإلا 404 |
| POST | `/api/v1/public/contact-messages` | إرسال استفسار ← 201. محدَّد المعدل (القسم 14) |

**شروط ظهور المشروع للعامة:** `IsPublished = true` و`IsDeleted = false`. الخدمات/التصنيفات/المواد غير الفعّالة لا تظهر في القوائم العامة، وتُحجب من تفاصيل المشروع العامة أيضاً.

### 9.3 الإدارة (Authorize)

كل مسار أدناه تحت `/api/v1/admin`.

**المشاريع**

| الطريقة | المسار | الوصف |
| --- | --- | --- |
| GET | `/projects` | كل المشاريع (منشورة وغير منشورة، غير المحذوفة). فلاتر: `search, categoryId, status, isPublished, page, pageSize` |
| GET | `/projects/{id}` | تفاصيل كاملة (تشمل `clientName` والصور) |
| POST | `/projects` | إنشاء ← 201 + Location |
| PUT | `/projects/{id}` | تعديل كامل (يُرسَل `rowVersion` للتحقق من التزامن) |
| PATCH | `/projects/{id}/publish` | Body: `{ isPublished }` ← 204 |
| DELETE | `/projects/{id}` | Soft Delete ← 204 |

جسم الإنشاء/التعديل: `title, slug?, shortDescription, description, categoryId, status, isPublished, isFeatured, city?, executionDate?, areaInSquareMeters?, durationInDays?, clientName?, displayOrder, serviceIds[], materialIds[]`. عند التعديل تُستبدل قوائم `serviceIds` و`materialIds` بالكامل (Sync).

**صور المشروع**

| الطريقة | المسار | الوصف |
| --- | --- | --- |
| POST | `/projects/{projectId}/images` | رفع صورة أو أكثر. `multipart/form-data`: `files` (حتى 10)، `stage?`، `altText?` (تنطبق على كل الملفات). أول صورة تُرفع لمشروع بلا صور تصبح الغلاف تلقائياً ← 201 |
| PUT | `/projects/{projectId}/images/{imageId}` | تعديل `altText` و`stage` فقط |
| PUT | `/projects/{projectId}/images/{imageId}/file` | استبدال ملف الصورة مع الإبقاء على بقية بياناتها (`multipart`: `file`) |
| PUT | `/projects/{projectId}/images/{imageId}/cover` | تعيين غلاف. يُزال الغلاف السابق ضمن Transaction واحدة ← 204 |
| PUT | `/projects/{projectId}/images/order` | Body: `{ orderedImageIds: [..] }`. يجب أن تطابق القائمة **كل** صور المشروع بلا زيادة ولا نقص، وإلا 400. يُعاد ترقيم `DisplayOrder` من 0 |
| DELETE | `/projects/{projectId}/images/{imageId}` | حذف السجل والملفين (الأصلي والمصغّرة). إن كانت غلافاً تُعيَّن أول صورة متبقية غلافاً تلقائياً ← 204 |

**التصنيفات والخدمات والمواد** (ثلاث مجموعات متطابقة النمط)

`GET /categories` · `GET /categories/{id}` · `POST /categories` · `PUT /categories/{id}` · `DELETE /categories/{id}` وكذلك `/services` و`/materials`. الحذف عند وجود مشاريع مرتبطة (بما فيها المحذوفة حذفاً ناعماً) ← **409** برسالة: "لا يمكن الحذف لارتباطه بمشاريع، يمكنك إيقاف تفعيله بدلاً من ذلك".

**رسائل العملاء**

| الطريقة | المسار | الوصف |
| --- | --- | --- |
| GET | `/contact-messages` | مرقّمة، فلتر `status`، الأحدث أولاً |
| GET | `/contact-messages/unread-count` | عدد رسائل `New` |
| GET | `/contact-messages/{id}` | تفاصيل (**لا** تغيّر الحالة) |
| PATCH | `/contact-messages/{id}/status` | Body: `{ status }` ← 204 (عند `Read` يُضبط `ReadAt`) |
| DELETE | `/contact-messages/{id}` | حذف فعلي ← 204 |

**إعدادات الموقع**

`GET /site-settings` و`PUT /site-settings` (تحديث الصف الوحيد). الصف يُنشأ بالـ Seeder، ولا يوجد POST ولا DELETE.

### 9.4 الترقيم والفلترة (Public Projects)

- المعاملات: `page` (افتراضي 1، ≥ 1)، `pageSize` (افتراضي 12، الحد الأقصى 50)، `categoryId?`، `serviceId?`، `materialId?`، `status?`، `featured?` (bool)، `search?` (يبحث في Title وShortDescription).
- الفرز الثابت: `DisplayOrder` تصاعدياً ثم `CreatedAt` تنازلياً. بلا معامل فرز في الإصدار 1.
- الاستجابة: `{ items: [...], page, pageSize, totalCount, totalPages }`.
- عنصر القائمة (`ProjectListItem`): `id, urlSegment, title, shortDescription, category{id,name}, status, city?, executionDate?, coverImage{url, thumbnailUrl, altText}? , isFeatured`. **لا** يتضمن الوصف الكامل ولا كل الصور.
- تفاصيل المشروع (`ProjectDetails`): كل ما سبق + `description`, `areaInSquareMeters?`, `durationInDays?`, `services[{id,name}]`, `materials[{id,name}]`, `images[{id,url,thumbnailUrl,altText,stage,isCover,displayOrder}]` مرتبة حسب `DisplayOrder`. **بلا** `clientName`.
- `page` أكبر من المتاح ← قائمة فارغة وليس خطأ.

### 9.5 قواعد التحقق (FluentValidation، الرسائل بالعربية)

- **Project:** `title` 3–200، `shortDescription` 10–500، `description` ≥ 20، `categoryId` موجود وفعّال، `status` قيمة صحيحة، `serviceIds` كلها موجودة (قائمة غير فارغة)، `materialIds` موجودة إن وُجدت، بلا تكرار داخل القوائم، `areaInSquareMeters` و`durationInDays` > 0 إن وُجدا، `executionDate` ليس بعد أكثر من سنتين من اليوم.
- **Category/Service/Material:** الاسم مطلوب وفريد (مقارنة بلا حساسية لحالة الأحرف وبعد `Trim`). التكرار ← 409.
- **ContactMessage:** `fullName` 2–100، `phone` بصيغة أرقام (يُسمح بـ `+` والمسافات والشرطات) بين 7 و20 رقماً، `email` صحيح إن وُجد، `message` 10–2000، **حقل Honeypot** باسم `website` يجب أن يكون فارغاً (إن كان معبّأً: أرجع 201 وهمياً دون حفظ ولا إشعار).
- **SiteSettings:** الروابط بصيغة URL مطلقة `https://`، الهاتف والبريد بصيغ صحيحة إن وُجدت.
- كل النصوص تُنظَّف بـ `Trim`. لا تُحفَظ HTML tags في الحقول النصية القصيرة (ارفض إن وُجد `<` أو `>`، أو اعمل Encode عند العرض: القرار على الواجهة، لكن الـ API لا يُصدِر HTML أبداً).

## 10. المصادقة والتفويض

- **Identity:** `ApplicationUser` مع `AddIdentityCore` (بدون واجهات UI). سياسة كلمة المرور: ≥ 10 أحرف، حرف كبير وصغير ورقم. `RequireUniqueEmail = false`.
- **القفل (Lockout):** مفعّل، 5 محاولات فاشلة ← قفل 15 دقيقة.
- **JWT:** خوارزمية HS256، المفتاح ≥ 32 بايت من الإعدادات السرية، `Issuer` و`Audience` و`ExpiryMinutes` من الإعدادات (افتراضي 480 دقيقة)، `ClockSkew = 1 دقيقة`. Claims: `sub` (UserId)، `unique_name`، `jti`. **لا Refresh Token.**
- **السياسة:** الـ Authorization الافتراضي لكل مسارات `/admin` هو `RequireAuthenticatedUser`. لا Roles.
- **Seeder** (يعمل عند الإقلاع في كل البيئات، ويتخطى ما هو موجود):
  1. إن لم يوجد أي مستخدم: أنشئ الأدمن من `AdminSeed:Username` و`AdminSeed:Password`. إن كانت كلمة المرور فارغة في Production ← **افشل الإقلاع** برسالة واضحة.
  2. أنشئ صف `SiteSettings` (Id=1) بقيم افتراضية فارغة ما عدا `SiteName`.
  3. إن كانت الجداول فارغة: أضف الخدمات (عزل مائي، عزل حراري، عزل صوتي، عزل الأسطح، عزل الخزانات، معالجة تسربات المياه) والتصنيفات (سكني، تجاري، صناعي، خزانات). **لا مواد افتراضية.**
- تطبيق الـ Migrations: تلقائي في Development فقط. في Production يُنفَّذ يدوياً (`dotnet ef database update`)، ووثّق ذلك في README.

## 11. تخزين الملفات والصور

**التخزين:** مجلد محلي خارج مجلد الكود، من الإعداد `Storage:RootPath`. الهيكل: `{root}/projects/{projectId}/{guid}.{ext}` للأصل و`{guid}_thumb.webp` للمصغّرة. يُقدَّم عبر `UseStaticFiles` على المسار `/uploads` (`RequestPath`)، **بدون** Directory Browsing، مع `Cache-Control: public, max-age=2592000`.

**واجهة `IFileStorage`:** `SaveAsync(stream, relativePath)`، `DeleteAsync(relativePath)`، `ExistsAsync`. ويجب منع **Path Traversal**: لا تقبل أي مسار من المستخدم أبداً، والأسماء تُولَّد بالكامل من الخادم، وتحقق أن المسار النهائي داخل `RootPath`.

**خط معالجة كل صورة (إلزامي بالترتيب):**

1. رفض الملف الفارغ، وما يتجاوز **8 MB** للملف الواحد.
2. التحقق من الامتداد المسموح: `.jpg .jpeg .png .webp`.
3. التحقق من **المحتوى الفعلي (Magic Bytes)** لا الامتداد فقط: JPEG `FF D8 FF`، PNG `89 50 4E 47 0D 0A 1A 0A`، WebP `RIFF....WEBP`. عدم التطابق ← 400.
4. فتح الصورة بـ ImageSharp (فشل الفتح ← 400). حد أقصى للأبعاد قبل المعالجة 12000×12000 لمنع Decompression Bombs.
5. تصحيح الاتجاه (Auto-Orient) ثم **إزالة كل بيانات EXIF/Metadata** (ومنها GPS).
6. تصغير الأصل إن زاد أطول ضلع عن **2000px** (مع الحفاظ على النسبة)، وإعادة ترميزه بنفس الصيغة بجودة 85. هذه **إعادة ترميز** تُحيّد أي حمولة مخفية.
7. توليد مصغّرة WebP بعرض **480px** (جودة 75).
8. تسمية الملف بـ `Guid.NewGuid()` والامتداد المناسب لصيغته المكتشفة (لا من اسم العميل).
9. الحفظ على القرص ثم السجل في القاعدة. **عند فشل القاعدة احذف الملفات المكتوبة** (تنظيف)، وعند فشل الحذف من القرص بعد حذف السجل سجّل تحذيراً ولا ترمِ خطأً.

**حدود:** حتى 10 ملفات في الطلب، وحتى 40 صورة لكل مشروع (تجاوز ← 400)، وحد جسم الطلب لهذا الـ endpoint 90 MB عبر `RequestSizeLimit` وإعداد Kestrel/Forms.

**ترتيب الصور الجديدة:** تأخذ `DisplayOrder = max + 1` بحسب ترتيب وصولها في الطلب. `OriginalFileName` يُنظَّف من أي مسار ويُقصّ إلى 260.

## 12. إشعار البريد الإلكتروني (غير متزامن)

**التدفق عند `POST /public/contact-messages`:**

1. تحقق (Validation + Honeypot).
2. احفظ الرسالة في القاعدة بـ `NotificationStatus = Pending` وأرجع **201** فوراً. نجاح الحفظ هو معيار نجاح الطلب، وفشل البريد لا يؤثر على العميل أبداً.
3. ضع `MessageId` في طابور داخلي `IEmailQueue` (مبني على `System.Threading.Channels`).
4. `EmailBackgroundService` (`BackgroundService`) يقرأ الطابور، يجلب الرسالة وعنوان `SiteSettings.NotificationEmail`، ويرسل عبر `IEmailSender`.
5. إعادة المحاولة: 3 محاولات بفاصل متزايد (30 ثانية، 2 دقيقة، 10 دقائق). النجاح ← `Sent`، والفشل النهائي ← `Failed` مع تسجيل الخطأ.
6. **عند الإقلاع:** تُعاد إلى الطابور كل الرسائل بحالة `Pending` أو `Failed` المنشأة خلال آخر 24 ساعة (حتى لا تضيع الإشعارات عند إعادة التشغيل). كل معالجة داخل `IServiceScope` مستقل.
7. إن لم يكن `NotificationEmail` مضبوطاً، فلا تُرسل ولا تُعد المحاولة: سجّل تحذيراً وأبقِ الحالة `Pending`.

**واجهة `IEmailSender`** (في Application): `Task SendAsync(EmailMessage message, CancellationToken ct)`. التنفيذ بـ MailKit/SMTP في Infrastructure (STARTTLS، المضيف والمنفذ والمستخدم وكلمة المرور من الإعدادات السرية، `From` من الإعدادات).

**محتوى البريد:** عنوان: `رسالة جديدة من الموقع: {FullName}`. النص (HTML بسيط مع Encode لكل القيم المُدخلة): الاسم، الهاتف، البريد، الموضوع، الرسالة، التاريخ. ضع `Reply-To` على بريد العميل إن وُجد. **لا تُرسل أي بريد للعميل نفسه.**

## 13. الأمان

- **HTTPS:** `UseHttpsRedirection` و`UseHsts` في Production.
- **CORS:** سياسة مسماة تقرأ `Cors:AllowedOrigins` (مصفوفة) من الإعدادات. ممنوع `AllowAnyOrigin` في Production. الطرق والرؤوس المسموحة محددة.
- **Forwarded Headers:** فعّل `UseForwardedHeaders` (`XForwardedFor`, `XForwardedProto`) لأن الخادم غالباً خلف Reverse Proxy (IIS/Nginx)، ليعمل تحديد المعدل وتسجيل الـ IP بشكل صحيح.
- **رؤوس الأمان** (Middleware بسيط): `X-Content-Type-Options: nosniff`، `X-Frame-Options: DENY`، `Referrer-Policy: no-referrer`.
- **Rate Limiting** (`AddRateLimiter`، التقسيم حسب IP، الرد 429 مع `Retry-After`):
  - `POST /auth/login`: 10 طلبات / 15 دقيقة.
  - `POST /public/contact-messages`: 5 طلبات / ساعة.
  - باقي الـ API العام: 120 طلباً / دقيقة.
  - رفع الصور (Admin): 30 طلباً / دقيقة.
- **الحماية من الحقن:** استخدم EF Core فقط (Parameterized). ممنوع تنفيذ SQL نصي يُركَّب من مدخلات المستخدم.
- **Mass Assignment:** لا تربط (Bind) الطلبات بالكيانات مباشرة. DTOs مخصصة فقط.
- **البيانات الحساسة:** لا تُسجَّل كلمات المرور ولا الـ Tokens ولا محتوى الرسائل الكامل في السجلات. `ClientName` و`NotificationEmail` لا يظهران في أي استجابة عامة (تُغطّى باختبار).
- **Swagger:** يُفعَّل في Development فقط، أو في Production خلف إعداد صريح `Swagger:Enabled`.

## 14. معالجة الأخطاء والتسجيل والصحة

**معالج أخطاء عام** (`IExceptionHandler` + `AddProblemDetails`)، والاستجابة بنمط RFC 7807 دائماً:

| الاستثناء | الحالة | ملاحظات |
| --- | --- | --- |
| `ValidationException` (FluentValidation) | 400 | `ValidationProblemDetails` مع `errors` لكل حقل، الرسائل عربية |
| `NotFoundException` | 404 | رسالة عربية مثل "المشروع غير موجود" |
| `ConflictException` / `DbUpdateConcurrencyException` | 409 |  |
| `UnauthorizedAccessException` / فشل الدخول | 401 |  |
| أي استثناء غير متوقع | 500 | رسالة عامة موحدة، **بلا Stack Trace** خارج Development، ومعها `traceId` |

- يجب أن ترد أخطاء الـ Authentication/Authorization (401/403) بصيغة ProblemDetails أيضاً.
- **التحقق:** ينفَّذ داخل الـ Application Services (أو عبر ActionFilter موحد) بحيث يكون السلوك واحداً. لا تعتمد على `ModelState` فقط.
- **Serilog:** Console + ملف يومي في `logs/` (احتفاظ 14 يوماً)، مع `traceId` و`UserName` إن وُجد. ممنوع Log لكلمات المرور.
- **Health Check:** `GET /health` يفحص الاتصال بقاعدة البيانات وإمكانية الكتابة في `Storage:RootPath`. بلا مصادقة، بلا تفاصيل حساسة.

## 15. ملف الإعدادات (`appsettings.json`) والأسرار

المفاتيح المطلوبة (القيم الحساسة **فارغة** في الملف المرفوع ومحددة عبر User Secrets/متغيرات البيئة):

```json
{
  "ConnectionStrings": { "Default": "" },
  "Jwt": { "Issuer": "InsulationPortfolio", "Audience": "InsulationPortfolio.Admin", "Key": "", "ExpiryMinutes": 480 },
  "AdminSeed": { "Username": "admin", "Password": "" },
  "Storage": { "RootPath": "", "MaxFileSizeMb": 8, "MaxImagesPerProject": 40 },
  "Email": { "Host": "", "Port": 587, "Username": "", "Password": "", "FromAddress": "", "FromName": "موقع المقاول", "UseStartTls": true },
  "Cors": { "AllowedOrigins": [] },
  "Swagger": { "Enabled": false }
}
```

- استخدم `IOptions<T>` مع **Options Validation** (`ValidateOnStart`) بحيث يفشل الإقلاع برسالة واضحة إن غاب إعداد إلزامي (مثل `Jwt:Key`).
- أنشئ `appsettings.Development.json` بقيم تطوير آمنة (غير سرية) و`appsettings.Production.json` كقالب فقط.

## 16. التوثيق (Swagger/OpenAPI)

- كل Endpoint موثّق بـ `[ProducesResponseType]` لكل الحالات (200/201/204/400/401/404/409/429).
- مجموعتان في Swagger: `Public` و`Admin`، مع تعريف `Bearer` لزر Authorize.
- أمثلة الطلبات في الوثائق XML Comments للـ DTOs الأساسية.
- يُنشأ `README.md` يشرح: المتطلبات، ضبط الأسرار، تشغيل الـ Migrations، التشغيل المحلي، هيكل المجلدات، النشر (IIS/Linux + مجلد `uploads` ومنح صلاحيات الكتابة).

## 17. الاختبارات

**اختبارات الوحدة (Unit):** مدقّقات FluentValidation، منطق الـ Slug، منطق الغلاف والترتيب في `ImageService` (حذف الغلاف، إعادة الترقيم، رفض قائمة ترتيب ناقصة)، التحقق من Magic Bytes.

**اختبارات التكامل (Integration)** عبر `WebApplicationFactory` وقاعدة بيانات حقيقية معزولة، وتغطي كحد أدنى:

1. الدخول: نجاح، كلمة مرور خاطئة (401)، القفل بعد 5 محاولات، وصول `/admin/*` بلا Token (401).
2. المشروع: إنشاء ← ظهور في العام فقط عند `IsPublished`، Soft Delete يخفيه، **عدم ظهور `clientName`** في أي استجابة عامة.
3. الصور: رفع صورة صحيحة، رفض ملف نصي مُسمّى `.jpg`، رفض ملف أكبر من الحد، غلاف واحد فقط، حذف الغلاف يعيّن بديلاً.
4. حذف تصنيف/خدمة/مادة مرتبطة ← 409.
5. رسالة العميل: حفظ ناجح، نجاح الطلب حتى عند فشل SMTP (استبدل `IEmailSender` بنسخة تفشل)، Honeypot لا يحفظ، تجاوز Rate Limit ← 429.
6. الترقيم: `pageSize` أكبر من 50 يُقصّ أو يُرفض (قرارك: **يُرفض بـ 400**).

## 18. معايير الجودة العامة

- لا تحذيرات مترجم مهمة، و`Nullable` مفعّل في كل المشاريع، و`TreatWarningsAsErrors` لـ Domain وApplication.
- لا استعلام قاعدة بيانات داخل حلقة. لا `ToList()` قبل `Where` أو `Select`.
- كل الـ Services تسجَّل بـ `Scoped`، والـ Queue بـ `Singleton`.
- لا Exceptions للتحكم في التدفق الطبيعي عدا ما ورد في القسم 14.
- تنسيق موحّد عبر `.editorconfig`.
- Commit صغيرة ورسائل واضحة (إن كان المنفّذ يستخدم Git)، وreadme محدّث.

## 19. مراحل التنفيذ ومعايير القبول

نفّذ بالترتيب، وتوقّف بعد كل مرحلة لعرض الملخص والانتظار.

| # | المرحلة | معيار القبول |
| --- | --- | --- |
| 0 | **الهيكل:** الحل والمشاريع الأربعة ومشاريع الاختبار، المراجع الصحيحة وفق القسم 4، الحزم، `.editorconfig`، Serilog، Swagger، ProblemDetails، Health، CORS، Options Validation | يبني بلا أخطاء، `/swagger` و`/health` يعملان، التبعيات تحترم القواعد (لا مرجع عكسي) |
| 1 | **قاعدة البيانات:** الكيانات والـ Enums وإعدادات EF والفهارس والـ Query Filter وأول Migration والـ Seeder | الـ Migration تُطبَّق على قاعدة فارغة، الـ Seeder يُنشئ الأدمن والإعدادات والخدمات والتصنيفات، وتشغيله مرتين لا يكرّر شيئاً |
| 2 | **المصادقة:** Identity وJWT وLogin وChange-password وMe وLockout وRate Limit للدخول | اختبارات القسم 17 البند 1 تنجح، وSwagger يستطيع الاستدعاء بعد Authorize |
| 3 | **القوائم المرجعية:** CRUD للتصنيفات والخدمات والمواد (Admin) + قراءة عامة | منع الحذف المرتبط (409)، منع التكرار، القوائم العامة تعرض الفعّال فقط |
| 4 | **المشاريع:** CRUD (Admin) مع الخدمات والمواد، النشر، Soft Delete، التزامن | التحقق من القسم 9.5 يعمل، `rowVersion` يمنع الكتابة المتعارضة |
| 5 | **الصور:** الخط الكامل للقسم 11 وكل endpoints الصور والتخزين المحلي والتقديم الثابت | كل بنود الاختبار 3 تنجح، تنظيف الملفات عند الفشل، لا ثغرة Path Traversal |
| 6 | **الـ Public API:** المشاريع (ترقيم + فلاتر + تفاصيل)، الخدمات، التصنيفات، المواد، الإعدادات | `clientName` و`notificationEmail` غائبان، المسودات والمحذوفات لا تظهر، الأداء: لا N+1 |
| 7 | **الرسائل والبريد:** حفظ الرسالة، الطابور والخدمة الخلفية وإعادة المحاولة واستعادة الإقلاع، endpoints الإدارة، Rate Limit وHoneypot | اختبارات البند 5 تنجح |
| 8 | **إعدادات الموقع:** GET/PUT للأدمن، القراءة العامة | التحقق من الروابط والصيغ، لا يوجد إنشاء ولا حذف |
| 9 | **التثبيت:** استكمال الاختبارات، مراجعة أمنية (القسم 13)، README، مراجعة Swagger | `dotnet test` كله ينجح، قائمة التحقق في القسم 20 مكتملة |

## 20. قائمة التحقق النهائية (Definition of Done)

- [ ] كل Endpoints القسم 9 موجودة وبالمسارات والرموز المحددة.
- [ ] لا Entity تُرجَع من الـ API، لا وصول مباشر لـ DbContext من الـ Controllers.
- [ ] لا أسرار في المستودع، والإقلاع يفشل بوضوح عند غياب الإعدادات الإلزامية.
- [ ] كل رسائل الأخطاء الموجّهة للمستخدم بالعربية، وكل الأخطاء بصيغة ProblemDetails.
- [ ] رفع الصور يتحقق من Magic Bytes ويعيد الترميز ويزيل EXIF ويولّد المصغّرات.
- [ ] إرسال الرسالة ينجح حتى لو تعطّل البريد، ولا تضيع الإشعارات عند إعادة التشغيل.
- [ ] Rate Limiting وCORS وHeaders الأمان مفعّلة.
- [ ] جميع الاختبارات تنجح، ولا تحذيرات مهمة عند البناء.
- [ ] README مكتمل، ويشرح النشر ومنح صلاحيات مجلد الرفع.

## 21. أسئلة يجب على المنفّذ طرحها بدل الافتراض

إن واجهت أي من هذه، **توقّف واسأل** ولا تقرّر منفرداً: تعارض بين بند وآخر في هذه الوثيقة، حاجة لحزمة غير مذكورة وليست متوافقة مع .NET 10، أي تغيير في الكيانات أو المسارات المعتمدة، مشكلة ترخيص في حزمة، أو حاجة لميزة خارج النطاق (القسم 1).
