# Yasal Pozisyonlama ve Claim Stratejisi

## Ne Olmadığımız (Asla Söylemiyoruz)
- "Alzheimer'ı tedavi eder / önler / geciktirir"
- "Demans riskini azaltır"
- "Tıbbi teşhis koyar"
- "Nörolojik bozuklukları tespit eder"

Bunların hiçbiri uygulama içinde, App Store metadata'sında, push notification'larda
veya pazarlama materyallerinde **geçmiyor**.

## Ne Olduğumuz
> "FINGER (2015, Lancet) ve U.S. POINTER klinik çalışmalarının bilimsel bulgularına
> dayanan, çok bileşenli yaşam tarzı takip ve kognitif antrenman platformu."

Kategori: **Health & Fitness** (Medical değil)
App Store positionu: Yaşam tarzı uygulaması

## Bilimsel Referans Stratejisi
Her modülün altında küçük bir "Bilimsel Kaynak" bölümü:
```
Bu antrenman metodolojisi şu çalışmalara dayanmaktadır:
• Ngandu et al. (2015). A 2 year multidomain intervention... Lancet. PMID: 25771069
• Kivipelto et al. (2020). FINGER. Nature Reviews Neurology.
```
PubMed ID'leri ile link. Iddia yok, kaynak var — bu tamamen yasal.

## Sesli Günlük / Fluency Score Yasal Çerçevesi
Kullanıcıya gösterilen dil:
> "Zihinsel Akıcılık Skorunuz bu hafta 74/100.
> Bu skor tıbbi bir teşhis veya değerlendirme niteliği taşımaz.
> Konuşma alışkanlıklarınızdaki trendi takip etmenize yardımcı olmak için
> tasarlanmış bir kişisel farkındalık aracıdır."

Disclaimer onboarding'de de imzalatılıyor (checkbox + timestamp, DB'ye yazılıyor).

## Veri Gizliliği
- Ses kayıtları işlendikten sonra ham formatta saklanmıyor (sadece feature vektörleri)
- GDPR uyumlu veri silme endpoint'i (kullanıcı istediğinde tüm data silinir)
- Apple Health / Google Fit verisi sadece kullanıcının izniyle çekiliyor, üçüncü tarafla paylaşılmıyor

## FDA Pozisyonu
Wellness / lifestyle app olarak konumlandığımız için FDA 510(k) clearance gerekmez.
Referans: FDA Digital Health Policy — General Wellness Products (2016 Guidance).
"Low risk" wellness kategorisindeyiz.
