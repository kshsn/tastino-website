// DRAFT legal texts for the Privacy Policy and Terms of Use (EN + AR).
// They state only facts that are true of this site today (what the forms collect, where it goes, the 24-month
// retention period, Egypt's PDPL No. 151 of 2020). They are NOT approved: the pages show a visible draft notice and
// `npm run check:launch` fails until the client's legal adviser approves them (setting `legal.<page>.approved`).
// Lines starting with "## " are section headings; other blank-line-separated paragraphs are plain text.

export const LEGAL_VERSION_DATE = '2026-10-24';

export interface LegalBlockSeed {
  key: 'privacy' | 'terms';
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
}

const PRIVACY_EN = `## Who we are

Tastino Foods Inc., Industrial City, 10th of Ramadan, C5, Building No. 21, Egypt. You can reach us at info@tastinofoods.com.

## What we collect

When you send us a distributor application, catalogue request or enquiry through this website, we collect the details you type in: your name, email address, company, country and message, and your phone number if you give it. We also keep the language of the page you used and the date and time you agreed to this policy.

## Why we use it

We use your details to reply to your enquiry, to discuss distribution and business partnerships, and to send you our product catalogue if you ask for it. We do not sell your data and we do not use it for unrelated marketing.

## Where it is stored and who sees it

Your message is stored in the Tastino database and is emailed to info@tastinofoods.com. Only Tastino staff who handle enquiries can see it.

## How long we keep it

We keep enquiries for 24 months after you contact us. After that we review them and delete or anonymise them.

## Your rights

Under Egypt's Personal Data Protection Law No. 151 of 2020, you may ask to see the data we hold about you, to correct it, to have it deleted, or to withdraw your consent. Write to info@tastinofoods.com and we will respond as the law requires.

## Cookies

This website sets one functional cookie that remembers the language you chose. It is not used for tracking. The website does not use advertising cookies. If we add visitor statistics in the future, they will run only after you accept them.

## Changes to this policy

We may update this page. The date at the top shows when it was last changed.`;

const PRIVACY_AR = `## من نحن

تستينو فودز، المنطقة الصناعية، العاشر من رمضان، C5، مبنى رقم 21، مصر. يمكنك التواصل معنا عبر info@tastinofoods.com.

## البيانات التي نجمعها

عند إرسال طلب توزيع أو طلب كتالوج أو استفسار عبر هذا الموقع، نجمع البيانات التي تدخلها: اسمك وبريدك الإلكتروني وشركتك ودولتك ورسالتك، ورقم هاتفك إذا قدمته. كما نحتفظ بلغة الصفحة التي استخدمتها وتاريخ ووقت موافقتك على هذه السياسة.

## لماذا نستخدمها

نستخدم بياناتك للرد على استفسارك ولمناقشة فرص التوزيع والشراكات التجارية ولإرسال الكتالوج إذا طلبته. نحن لا نبيع بياناتك ولا نستخدمها في تسويق غير ذي صلة.

## أين تُخزَّن ومن يطلع عليها

تُخزَّن رسالتك في قاعدة بيانات تستينو وتُرسَل بالبريد الإلكتروني إلى info@tastinofoods.com. لا يطلع عليها سوى موظفي تستينو المسؤولين عن الاستفسارات.

## مدة الاحتفاظ

نحتفظ بالاستفسارات لمدة 24 شهراً بعد تواصلك معنا، ثم نراجعها ونحذفها أو نجعلها مجهولة الهوية.

## حقوقك

وفقاً لقانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020، يحق لك طلب الاطلاع على بياناتك لدينا أو تصحيحها أو حذفها أو سحب موافقتك. راسلنا على info@tastinofoods.com وسنرد وفقاً لما يقتضيه القانون.

## ملفات تعريف الارتباط

يضع هذا الموقع ملف تعريف ارتباط وظيفياً واحداً لتذكّر اللغة التي اخترتها، ولا يُستخدم للتتبع. ولا يستخدم الموقع ملفات تعريف ارتباط إعلانية. وإذا أضفنا إحصاءات للزوار مستقبلاً فلن تعمل إلا بعد موافقتك.

## تعديلات هذه السياسة

قد نحدّث هذه الصفحة، ويبيّن التاريخ في أعلاها آخر تعديل.`;

const TERMS_EN = `## Using this website

This website gives business visitors information about Tastino Foods and its products. We may change the content, product ranges, sizes and packaging at any time, and availability can vary by market.

## No offer

Nothing on this website is an offer to sell. Prices are not published. To receive a quotation, contact our sales team.

## Ownership

The text, images, logos and brand names on this website, including Tastino, Lora, Liora, Andiamo, TAMA, Freshness and THE LEAF, belong to Tastino Foods Inc. or its licensors. Please do not copy or reuse them without our written permission.

## What you send us

Please make sure the information you send through our forms is accurate. We handle it as described in our Privacy Policy.

## Availability and liability

We work to keep this website available and accurate, but it is provided as it is. To the extent the law allows, Tastino Foods Inc. is not liable for any loss caused by using it.

## Links to other websites

Links to other websites are for your convenience. We do not control those websites.

## Governing law

These terms are governed by the laws of the Arab Republic of Egypt.

## Contact

Questions about these terms: info@tastinofoods.com.`;

const TERMS_AR = `## استخدام هذا الموقع

يقدّم هذا الموقع لزواره من قطاع الأعمال معلومات عن تستينو فودز ومنتجاتها. قد نغيّر المحتوى وتشكيلات المنتجات والأحجام والعبوات في أي وقت، وقد تختلف الإتاحة من سوق إلى آخر.

## لا يُعد عرضاً

لا يُعد أي محتوى في هذا الموقع عرضاً للبيع. الأسعار غير منشورة. للحصول على عرض سعر، تواصل مع فريق المبيعات.

## الملكية

النصوص والصور والشعارات وأسماء العلامات التجارية في هذا الموقع، ومنها تستينو ولورا وليورا وأندياموا وتاما وفريشنس وذا ليف، مملوكة لتستينو فودز أو للجهات المرخِّصة لها. يرجى عدم نسخها أو إعادة استخدامها دون إذن كتابي منا.

## ما ترسله إلينا

يرجى التأكد من صحة المعلومات التي ترسلها عبر نماذجنا. ونتعامل معها وفق ما هو موضح في سياسة الخصوصية.

## الإتاحة والمسؤولية

نعمل على إبقاء هذا الموقع متاحاً ودقيقاً، لكنه مقدَّم كما هو. وفي الحدود التي يسمح بها القانون، لا تتحمل تستينو فودز مسؤولية أي خسارة ناتجة عن استخدامه.

## روابط لمواقع أخرى

الروابط إلى مواقع أخرى هي لراحتك فقط، ولا نتحكم في تلك المواقع.

## القانون الواجب التطبيق

تخضع هذه الشروط لقوانين جمهورية مصر العربية.

## التواصل

للاستفسار عن هذه الشروط: info@tastinofoods.com.`;

export const LEGAL_BLOCKS: LegalBlockSeed[] = [
  { key: 'privacy', titleEn: 'Privacy Policy', titleAr: 'سياسة الخصوصية', bodyEn: PRIVACY_EN, bodyAr: PRIVACY_AR },
  { key: 'terms', titleEn: 'Terms of Use', titleAr: 'شروط الاستخدام', bodyEn: TERMS_EN, bodyAr: TERMS_AR },
];
