# Regulatory Landscape: Caregiver Marketplace + Health Data Platform
**BrainLongevity — Turkey & United States**
**Research Date: June 2025**

---

## Özet / TL;DR

| Risk | Ülke | Seviye | Çözüm |
|------|------|--------|-------|
| Sağlık verisi lokalizasyonu | TR | 🔴 Blocker | AWS İstanbul / Azure Turkey North |
| Sağlık Bakanlığı USBS kaydı | TR | 🔴 Blocker | Healthcare avukat → piyasa öncesi |
| BDDK ödeme aracılığı lisansı | TR | 🟡 Yönetilebilir | iyzico/PayTR üzerinden PSP disbursement |
| MASAK KYC/AML | TR | 🟡 Yönetilebilir | Lisanslı PSP kullan; bakıcı dijital KYC |
| KVKK özel nitelikli veri | TR | 🔴 Blocker | Açık rıza mimarisi, VERBİS kaydı |
| FTC Health Breach Notification | US | 🟡 Yönetilebilir | İhlal müdahale planı, HIPAA kalitesi güvenlik |
| FTC tüketici koruma (Care.com riski) | US | 🟡 Yönetilebilir | Doğru iddialar, tek tık iptal, marketplace çerçevesi |
| Eyalet bazlı bakıcı lisanslaması | US | 🟡 Yönetilebilir | Gerçek marketplace yapısı; kapsamlı geçmiş kontrolü |
| Para transferi lisansı (MTL) | US | 🟢 Düşük | Stripe Connect hallederi |
| FDA SaMD — Brain Health Index | US | 🟡 Yönetilebilir | Dil disiplini; lansman öncesi regulatory opinion letter |
| ADA Title III erişilebilirlik | US | 🟢 Düşük | WCAG 2.1 AA uyumu |
| HIPAA | US | 🟢 Düşük | Muhtemelen uygulanmıyor; HIPAA kalitesi güvenlik uygula |

---

## Bölüm 1 — Türkiye

### 1.1 KVKK (Kişisel Verilerin Korunması Kanunu No. 6698)

**Temel Çerçeve:**
Türkiye'nin GDPR'a benzer ama önemli farklılıkları olan veri koruma kanunu. Kişisel Verileri Koruma Kurumu (KVKK Kurumu) tarafından uygulanır.

**Sağlık verisi "özel nitelikli kişisel veri" kapsamında (Madde 6).**
Uyku verisi, kognitif skorlar, beyin sağlığı endeksleri ve bir kişinin sağlık durumuna bağlı her türlü veri bu kapsamdadır. Varsayılan kural: yasal istisna olmadıkça işleme **yasaktır**.

**Uygulamaya ne girer:**

- **Açık rıza zorunlu:** Her amaç için ayrı ayrı, bilgilendirilmiş, özgür iradeyle verilmiş, granüler ve her an geri alınabilir olmalı. Genel kullanım koşullarına gömmek yetersiz — 2025 KVKK değişiklikleri dijital rıza yönetimini ve kolay geri alma mekanizmasını açıkça zorunlu kıldı.
- **Ödeme verisi** özel nitelikli değil, normal kişisel veri; sözleşme ifası veya meşru menfaat hukuki dayanak olarak yeterli.
- **VERBİS kaydı:** Şirket veri sorumlusu olarak kayıt yaptırmak zorunda. 2026 ceza dilimi: 85.437 TL – 17.092.242 TL.
- **Veri işleyen sözleşmeleri:** Bulut, analitik, push notification gibi üçüncü taraf hizmetler için Veri İşleme Sözleşmesi zorunlu.
- **72 saatlik ihlal bildirimi:** 2025 değişiklikleri GDPR ile uyumlu hale getirdi.
- **VKO (Veri Koruma Sorumlusu):** Orta/büyük şirketler için 2025 değişiklikleri atama zorunluluğu getirdi. Startup olarak başlangıçta eşik altında olabilirsin ama planla.

**Sınır Ötesi Veri Transferi / Yerelleştirme:**
- **Dijital sağlık platformları için sağlık verisi Türkiye'de tutulmalı.** Sağlık Bakanlığı Uzaktan Sağlık Hizmetleri Yönetmeliği ve Cumhurbaşkanlığı Bilgi ve İletişim Güvenliği Genelgesi sağlık kayıtları için yurt içi depolamayı zorunlu kılıyor.
- AWS eu-south-1 İstanbul veya Azure Turkey North kullan. Seçenek yok.
- Kalan sınır ötesi transferler için 2024 KVKK Kurul güncellemeleri: yeterlilik kararı, KVK Kurumu onaylı Standart Sözleşme Maddeleri veya Bağlayıcı Şirket Kuralları gerekiyor.

**Risk: 🔴 Blocker** — Sağlık verisi yerelleştirmesi ve açık rıza mimarisi sıfırdan tasarlanmalı. Sonradan eklenmesi maliyetli.

---

### 1.2 BDDK — Ödeme Kuralları

**Çerçeve:** Ödeme ve Menkul Kıymet Mutabakat Sistemleri Kanunu (No. 6493) tüm ödeme hizmetlerini yönetir. BDDK ödeme kuruluşlarını lisanslar.

**Kritik soru: Komisyon modeliniz BDDK lisansı gerektiriyor mu?**

| Model | Lisans gerekli mi? |
|-------|-------------------|
| Hiç para tutmuyorsun; Stripe/iyzico/PayTR uçtan uca hallediyor; yalnızca PSP'den ücret alıyorsun | Muhtemelen hayır — merchant konumundasın |
| Aile ödemesini topluyorsun, tutuyorsun, bakıcıya aktarıyorsun (escrow/split) | **Evet — ödeme aracılığı lisansı gerekli** |
| Lisanslı PSP'ye ödemeyi bölmesini söyleyerek komisyon alıyorsun | Gri alan; hukuki görüş zorunlu |

2025 ödeme aracılığı kurumu sermaye şartı: **2.000.000 TL** (30 Haziran 2025 itibarıyla). Lisans başvurusu resmi başvuru, AML/KYC altyapısı ve MASAK uyumu gerektiriyor.

**MASAK (AML/KYC):** 2024 sonu MASAK değişiklikleri basitleştirilmiş KYC tedbirlerini kaldırdı. Ödeme ve e-para kurumları için yüz yüze veya dijital KYC/KYB **zorunlu**. Lisans alırsan en azından bakıcılar için kimlik doğrulama şart.

**Startup için pratik yol:** BDDK lisanslı PSP kullan (iyzico, PayTR, Paratika). Ödeme akışını şöyle yapılandır: aile → iyzico/PayTR'a ödeme yapar → PSP bakıcıya aktarır → PSP platform ücretini sana öder. Bu yapı MVP aşamasında BDDK lisans şartının dışında tutar. Canlıya geçmeden önce Türk fintech avukatıyla doğrula.

**Risk: 🟡 Yönetilebilir** — Risk gerçek ama lisanslı PSP üzerinden yapılandırma bunu aşar. Asla custom escrow yapma.

---

### 1.3 Sağlık Bakanlığı — Evde Bakım ve Dijital Sağlık Platformu

**İki ayrı düzenleyici hat var; uygulamanız her ikisinin kesişiminde:**

**Hat A: Evde Sağlık Hizmetleri**
2023 Yönetmeliği (Resmi Gazete, 2 Haziran 2023, Sayı 32209) evde sağlık hizmetlerini düzenler. Hizmetler ağırlıklı olarak hastaneler ve Bakanlık yetkili koordinasyon merkezleri üzerinden yürütülür. Bakıcılar **tıbbi hizmet** (hemşirelik, yara bakımı, fizyoterapi) sunuyorsa kurum veya hizmet sağlayıcı Bakanlık'tan lisans almak zorunda. Ailelerle lisanslı bakıcıları buluşturan saf bir marketplace gri alan — hizmeti sen sunmasan da düzenlenmiş faaliyeti kolaylaştırıyorsun.

**Hat B: Dijital Sağlık Platformu / Telemedicine**
2022 Uzaktan Sağlık Hizmetleri Yönetmeliği şunları zorunlu kılıyor:
- Bakanlık lisanslı telemedicine bilgi sistemi (USBS kaydı)
- Uzaktan Sağlık Faaliyeti Yetkilendirmesi
- Türkiye'de sunucu (KVKK ile örtüşüyor)

**Uygulamanla ilişkisi:**
Kognitif skorlar, uyku verisi ve beyin sağlığı endeksleri depoluyorsun. Bunlar klinik iddia içermese bile "sağlık takibi veya monitörizasyonu" olarak sunulursa Bakanlık uygulamayı tıbbi cihaz veya kayıt gerektiren dijital sağlık platformu olarak sınıflandırabilir. Gelmekte olan **Yapay Zeka ve Dijital Sağlık Uygulamaları Yönetmeliği** (taslak, muhtemelen 2025–2026) AI destekli tanılama araçları için onay prosedürü getirecek — beyin sağlığı endeks skoru büyük ihtimalle kapsam içine girecek.

**Kritik ayrım:** Sağlık verisi depolamayan ve sağlık iddiasında bulunmayan saf bir randevu/eşleştirme uygulaması Bakanlık kapsamı dışında kalabilir. Kognitif gerilemeyi takip eden "Beyin Sağlığı Endeksi" skoru olan uygulama neredeyse kesinlikle kapsam içinde.

**Risk: 🔴 Blocker** — BHI özelliği Bakanlık'ın dijital sağlık platform alanını tetikliyor. Lansmandan önce Türk sağlık regülasyon avukatından USBS kaydı gerekip gerekmediğini sor.

---

### 1.4 Ek Türkiye Konuları

**App Store Ödemeleri:** Apple ve Google uygulama içi satın almalardan %15–30 komisyon alır. Abonelik veya rezervasyon ücretleri App Store üzerinden işlenirse bu geçerli. Çoğu B2B marketplace işlemi uygulama mağazası dışında (web checkout veya doğrudan ödeme SDK) işlenerek %30 komisyondan kaçınılır.

**İş Hukuku:** Bakıcıları bağımsız yüklenici (çalışan değil) olarak sınıflandırmanın Türk iş hukukunda SGK katkısı açısından sonuçları var. Platform ücretleri, programı ve çalışma koşullarını belirliyorsa Türk mahkemeleri bakıcıları çalışan olarak yeniden sınıflandırabilir. Gerçek bağımsızlık için tasarla.

---

## Bölüm 2 — Amerika Birleşik Devletleri

### 2.1 HIPAA

**Kısa cevap: HIPAA muhtemelen uygulanmıyor — ama bu bir tuzak.**

**HIPAA neden muhtemelen uygulanmıyor:**
HIPAA "covered entity" (sağlık hizmeti sağlayıcıları, sağlık planları, sağlık takas merkezleri) ve "business associate"lerini bağlar. Şu özelliklere sahip bir bakıcı marketplace uygulaması:
- Bir sağlık planı veya hastanenin sahibi değil
- Sağlık verisini bir covered entity'den almak yerine kullanıcılardan (aileler, bakıcılar) doğrudan topluyor
- Covered entity adına veri iletmiyor

...neredeyse kesinlikle covered entity veya business associate **değil**. HHS'nin kendisi çoğu tüketici sağlık uygulamasının HIPAA kapsamında olmadığını teyit etti.

**Neden bu bir tuzak:**
**FTC Sağlık İhlali Bildirim Kuralı** (Nisan 2024 güncellendi, Mayıs 2024 yürürlüğe girdi) tüketici sağlık uygulamaları için HIPAA boşluğunu dolduruyor. Kapsamı:
- "Kişisel sağlık kaydı satıcıları" — tanımlanabilir sağlık bilgisi toplayan ve diğer sağlık veri kaynaklarıyla senkronize olabilen uygulamalar
- "PHR ilişkili kuruluşlar" — PHR satıcılarıyla etkileşime giren uygulamalar

Uygulamanız gerçek kullanıcılara bağlı uyku verisi, kognitif skor ve beyin sağlığı endeksi depoluyorsa FTC kuralı kapsamında kişisel sağlık kaydı satıcısısınız. Yükümlülükler:
- Veri ihlalinden itibaren 60 gün içinde etkilenen kullanıcıları bilgilendirme
- FTC'yi bilgilendirme
- Bir eyalette 500+ kişiyi etkileyen ihlalde medyayı bilgilendirme

**Pratik öneri:** Sistemi HIPAA uygulanıyormuş gibi tasarla. HIPAA kalitesi güvenlik kontrollerinin maliyeti (beklemede ve iletimde şifreleme, erişim günlükleme, minimum gerekli erişim) sağladığı sorumluluk korumasına kıyasla düşük — ve ABD aileleri için satış noktası.

**Risk: 🟡 Yönetilebilir** — HIPAA muhtemelen tetiklenmiyor ama FTC Sağlık İhlali Bildirim Kuralı kesinlikle tetikleniyor. Her halükarda HIPAA kalitesi kontroller uygula.

---

### 2.2 Bakıcı Lisanslaması — Eyalet Bazlı Mozaik

**Federal bakıcı lisansı yok.** Federal hükümet Medicare/Medicaid finansmanlı evde sağlık ajansları için asgari standartlar belirler (42 CFR Bölüm 484) ama tıbbi olmayan kişisel bakım tamamen eyalet düzeyinde düzenlenir.

**Önemli sınıflandırma — tıbbi vs. tıbbi olmayan bakım:**

| Bakım türü | Düzenleyici yük |
|------------|----------------|
| Arkadaşlık, yemek hazırlama, hafif ev işleri, ulaşım | Genellikle düşük; bazı eyaletler bakıcı kaydı ister |
| Kişisel bakım (banyo, giyinme, tuvalet) | Çoğu eyalet eğitim, geçmiş kontrolü, eyalet kaydı ister |
| Hemşirelik, ilaç verme, yara bakımı | Lisanslı hemşire gerekli; genellikle evde sağlık ajansı lisansı şart |

**Platform riski:** Gerçek marketplace olarak çalışıyorsan (bakıcılar bağımsız yüklenici, çalışan değil) genellikle lisans gerektiren "ajans" değilsindir. Ancak platform bakıcıları denetler, eğitir, yönlendirir veya kalitesini garanti ederse eyaletler seni ajans olarak yeniden sınıflandırabilir. Care.com eşleştirme hizmeti olduğunu, ajans olmadığını açıkça belirterek bu riskten kaçınıyor.

**Her eyalette pratik minimum:** Kapsamlı geçmiş kontrolü. Yaşlı/kognitif bozukluğu olan bireylerle çalışan bakıcılar için yeterli geçmiş taraması yapılmaması teknik olarak yasal zorunluluk olmasa bile ciddi sorumluluk riskine yol açar.

**Risk: 🟡 Yönetilebilir** — Gerçek marketplace yapısı korunursa ajans lisansı ajansın sorunu, platformun değil. Ama 1-2 eyaletin ötesine geçmeden eyalet bazlı hukuki inceleme yaptır.

---

### 2.3 FTC — Marketplace Platformları için Tüketici Koruması

**Care.com davası en önemli emsaldir.** Ağustos 2024'te FTC, Care.com'a (en yakın rakip platform) **8,5 milyon dolar** ceza kesti. Öne sürülen ihlaller:

1. **Şişirilmiş iş ilanı/bakıcı erişilebilirlik iddiaları** — aktif ilanların abartılması
2. **Yanıltıcı kazanç iddiaları** — verilerle desteklenmeyen saatlik ücret reklamı
3. **İptal için karanlık kalıplar** — kullanıcıların çıkmasını zorlaştırmak için tasarlanmış çok adımlı süreçler

**Uygulamanla ilişkisi:**
- Ailelere ("Yakınında X doğrulanmış bakıcı") veya bakıcılara ("Saatte Y TL kazan") gösterdiğin her metrik doğru ve kanıtlanabilir olmalı
- Abonelik veya platform ücreti iptali basit ve anında olmalı (FTC 2024 "tek tık iptal" kuralı)
- Hizmet Koşulları ne olduğunu (eşleştirme platformu) ve ne olmadığını (ajans, işveren, sağlık hizmeti sağlayıcı) açıkça belirtmeli

**FTC Mobil Sağlık Uygulaması Etkileşimli Aracı** tam senin gibi uygulamalar için var — uyumluluk incelemesi sırasında çalıştır.

**Risk: 🟡 Yönetilebilir** — Care.com davası ne yapılmaması gerektiğini gösteriyor. Kanıtlanmamış iddialardan ve karanlık kalıplardan kaçın, FTC riskin düşük kalır.

---

### 2.4 Ödeme İşleme — Para Transferi Lisansı

**Kısa cevap: Stripe Connect kullan. Kendi ödeme akışını yapma.**

Para transferi lisansları çoğunlukla eyalet bazlı. Tüm 50 eyalette lisans almak 12–18 ay sürer ve 500K–1M+ dolar harcar.

**Stripe Connect bu sorunu çözer.** Stripe tüm ABD eyaletlerinde para transferi lisanslarına sahip ve platformların lisanslı altyapısını kullanmasına izin verir:
- Stripe kayıtlı para transfercisi
- Fonları kendin tutmadan platform ücreti/komisyon toplarsın
- Tüm MTL gereksinimlerinden muafsın

**Kritik yapısal nokta:** Tahsilat ve ödeme arasında fonlar kendi hesabında bulunmamalı. Stripe Connect bakıcıların bağlı hesaplarına doğrudan öder. Gelirin ödeme zamanında kesilen platform ücretidir.

**Risk: 🟢 Düşük** — Stripe Connect doğru uygulanırsa para transferi lisanslama Stripe'ın sorunu.

---

### 2.5 FDA Dijital Sağlık Rehberi

**Soru: "Brain Health Index" veya "kognitif skor" uygulamayı tıbbi cihaz yapar mı?**

FDA, donanım olmadan "bir veya daha fazla tıbbi amaç için kullanılmak üzere tasarlanmış" yazılımı Tıbbi Cihaz Yazılımı (SaMD) olarak düzenler.

**Önemli sınır:**

| Uygulamanın yaptığı | FDA durumu |
|---------------------|-----------|
| Uyku/egzersizi wellness günlüğü olarak takip eder, klinik iddia yok | Tıbbi cihaz değil — wellness/lifestyle fonksiyonu açıkça muaf |
| BHI'yi skor olarak gösterir ama "tanı değildir" uyarısıyla | Gri alan — niyet ve pazarlama dili belirler |
| Kognitif gerilemeyi / Alzheimer'ı tespit, teşhis veya tahmin ettiğini iddia eder | **SaMD — FDA onayı gerekli (muhtemelen 510(k) yolu)** |

**Pratik kural:** Uygulamanın herhangi bir yerinde veya App Store açıklamasında "teşhis", "tespit et", "klinik", "Alzheimer" kelimelerini asla kullanma. BHI'yi wellness katılım metriği olarak çerçevele, klinik değerlendirme olarak değil. ABD App Store başvurusundan önce pazarlama metnini regulatory avukata incelet.

**Risk: 🟡 Yönetilebilir** — Dil disiplini FDA SaMD kapsamı dışında tutar. Herhangi bir kanalda tanısal iddia anında 12–18 aylık 510(k) sürecini tetikler.

---

### 2.6 ADA / Erişilebilirlik

**Neden önemli:**
Özel tüketici uygulamaları Title III kapsamında değerlendirilir. Title III ADA erişilebilirlik davaları 2024'te rekor kırdı.

**Neden daha da önemli:**
Kognitif gerileme yaşayan yaşlı bireyler için uygulama yapıyorsun. Küçük metin, düşük kontrast, karmaşık navigasyon, ekran okuyucu desteği yoksa hem hukuki risk hem gerçek kullanıcı deneyimi başarısızlığı.

**WCAG 2.1 AA** baştan uygulamak ucuz; sonradan eklemek pahalı.

**Risk: 🟢 Düşük** — Lansman engeli değil ama baştan inşa et.

---

## Bölüm 3 — Kritik Yol (Lansmandan Önce Top 3)

### Öncelik 1 — Türkiye Sağlık Verisi Sınıflandırması + Sunucu Mimarisi 🔴
Türk sağlık hukuku avukatıyla şu soruyu yanıtla: (a) hastalarla bakıcıları buluşturmak, (b) kognitif skor ve beyin sağlığı endeksi depolamak, (c) sağlığı uzun vadeli takip etmek kombinasyonu Bakanlık USBS kaydını dijital sağlık platformu olarak zorunlu kılıyor mu?

Cevap evet ise tüm backend Türkiye'de barındırılmalı ve uygulama Türkiye'de canlıya geçmeden önce Bakanlık kaydından geçmeli. Bu karar bulut mimarisini, maliyet yapısını ve takvimi belirler. **2–3 ay ve 50.000–150.000 TL hukuki/kayıt ücreti** bütçele.

Aynı görüşmede: BHI özelliğinin gelmekte olan AI ve Dijital Sağlık Uygulamaları Yönetmeliği'ni tetikleyip tetiklemediğini sorgula.

### Öncelik 2 — Ödeme Akışı Mimarisi 🟡
**Türkiye:** Türk fintech avukatıyla ödeme akışının (PSP'nin bakıcıya disbursement öncesi platform ücretini kesmesi) Kanun 6493 kapsamında ödeme aracılığı faaliyeti oluşturup oluşturmadığını teyit et. Tercih edilen yapı: aile → iyzico/PayTR'a öder → PSP bakıcıya öder → PSP platform ücretini sana öder. Paranın önce kendi hesabına geçtiği her varyant BDDK lisansı gerektirir.

**ABD:** Stripe Connect'i baştan uygula. Bakıcılar için hesap türü seçimi (Standard vs. Express vs. Custom) onboarding UX'ini ve uyum riskini etkiler. Stripe Connect marketplace kurmuş ödeme mühendisi işe al.

Her iki yolun da ilk gerçek işlemi yapmadan önce netleşmesi gerekiyor.

### Öncelik 3 — ABD "Brain Health Index" FDA Dil Denetimi 🟡→🔴
ABD'de en yüksek riskli özellik BHI. App Store başvurusundan önce dijital sağlık regulatory avukatından özellik setinin ve pazarlama dilinin SaMD iddiası oluşturup oluşturmadığına dair tek sayfalık FDA regulatory opinion letter al. Maliyeti ~3.000–8.000 dolar, süresi 2–3 hafta. Alacağın en ucuz sigorta.

Paralel olarak App Store açıklamasını, onboarding ekranlarını ve tüm pazarlama metinlerini FTC Mobil Sağlık Uygulaması Etkileşimli Aracı'ndan geçir. FTC Sağlık İhlali Bildirim Kuralı'nın doğru tarafında olduğundan emin ol (lansman öncesinde ihlal müdahale planın hazır olsun).

---

## Sonuç

**Türk startup'ı için önemli bulgu:** Türkiye ev pazarı olmasına rağmen regülasyon açısından ABD daha temiz bir başlangıç yolu sunuyor. Sağlık verisi yerelleştirmesi, Bakanlık dijital sağlık kuralları ve BDDK ödeme çerçevesi kombinasyonu Türkiye'yi ikincil (veya dikkatli bir hazırlıkla paralel) pazar yapar — daha kolay ev pazarı olarak değil.

ABD'de Stripe Connect kullan ve FDA dil sınırının doğru tarafında kal; Türkiye'de hukuki zemin hazır olmadan yayınlama.

---

## Kaynaklar

- [KVKK Özel Nitelikli Kişisel Veri Rehberi — DataGuidance](https://www.dataguidance.com/news/turkey-kvkk-publishes-guide-processing-special)
- [Türkiye Kişisel Sağlık Verisi Yönetmeliği Değişiklikleri — Mondaq](https://www.mondaq.com/turkey/data-protection/1726006)
- [KVKK 2025 Güncellemeleri Uyum Rehberi — Alfalaw](https://alfalawfirm.com/kvkk-2025-updates-a-compliance-guide-for-companies/)
- [Türkiye Veri Yerelleştirme 2025 — Gun + Partners](https://gun.av.tr/insights/guides/data-residency-in-turkey-for-2025)
- [BDDK Elektronik Para Lisansı — Advocate Turkey](https://advocateturkey.com/2025/08/18/bddk-electronic-money-license)
- [Fintech Kanun ve Yönetmelikler 2025 Türkiye — Global Legal Insights](https://www.globallegalinsights.com/practice-areas/fintech-laws-and-regulations/turkey/)
- [Türkiye'de Ödeme/E-Para Hizmetleri — Chambers and Partners](https://chambers.com/articles/providing-payment-e-money-services-in-turkiye-how-to-obtain-a-license)
- [Dijital Sağlık Kanun ve Yönetmelikleri Türkiye 2025–2026 — ICLG](https://iclg.com/practice-areas/digital-health-laws-and-regulations/turkey)
- [Türkiye Dijital Sağlık Uygulamaları ve Telemedicine — CMS](https://cms.law/en/int/expert-guides/cms-expert-guide-to-digital-health-apps-and-telemedicine/turkiye)
- [HHS — Covered Entities and Business Associates](https://www.hhs.gov/hipaa/for-professionals/covered-entities/index.html)
- [FTC Sağlık İhlali Bildirim Kuralı Değişiklikleri — FTC](https://www.ftc.gov/news-events/news/press-releases/2024/04/ftc-finalizes-changes-health-breach-notification-rule)
- [FTC Care.com'a İşlem — FTC Basın Bülteni](https://www.ftc.gov/news-events/news/press-releases/2024/08/ftc-takes-action-against-carecom-deceiving-caregivers-about-wages-availability-jobs-its-site)
- [FDA Tıbbi Cihaz Yazılımı (SaMD)](https://www.fda.gov/medical-devices/digital-health-center-excellence/software-medical-device-samd)
- [Stripe Connect Marketplace Ödeme İşleme](https://stripe.com/connect/marketplaces)
- [Para Transferi Lisansı 2026 Rehberi — Finextra](https://www.finextra.com/blogposting/30783/money-transmitter-license-in-2026)
- [Eyalet Bazlı Evde Bakım Ajansı Lisans Gereksinimleri — Enginehire](https://enginehire.io/do-home-care-agencies-need-a-license-requirements/)
- [FTC Mobil Sağlık Uygulaması Etkileşimli Aracı](https://www.ftc.gov/business-guidance/resources/mobile-health-apps-interactive-tool)
- [ADA Title II Web ve Mobil Uygulama Kuralı — ADA.gov](https://www.ada.gov/title-ii-web-rule/)
