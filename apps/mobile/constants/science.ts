export interface Article {
  title: string
  authors: string
  year: number
  journal: string
  summary: string
  pubmedId?: string
}

export interface GameScience {
  cognitiveFunction: string
  whyItMatters: string
  brainRegion: string
  articles: Article[]
}

export const GAME_SCIENCE: Record<string, GameScience> = {
  stroop_classic: {
    cognitiveFunction: 'Seçici Dikkat & İnhibisyon',
    whyItMatters:
      'Beynin ön lobunun (prefrontal korteks) dikkat dağıtıcılara karşı direncini ölçer ve geliştirir. Erken kognitif gerilemede bu direnç ilk düşen kapasitedir.',
    brainRegion: 'Prefrontal Korteks (PFC), Anterior Cingulate Cortex',
    articles: [
      {
        title: 'Studies of interference in serial verbal reactions',
        authors: 'Stroop, J. R.',
        year: 1935,
        journal: 'Journal of Experimental Psychology',
        summary:
          'Stroop testinin temel makalesi. Kelime anlamı ile mürekkep renginin çeliştiği durumlarda tepki süresinin uzadığını kanıtladı — "Stroop Effect" olarak tarihe geçti. 90 yıldır nöropsikolojinin temel taşı.',
        pubmedId: 'doi:10.1037/h0054651',
      },
      {
        title: 'The Stroop Color-Word Test: A Review',
        authors: 'MacLeod, C. M.',
        year: 1991,
        journal: 'Psychological Bulletin',
        summary:
          '50 yıllık Stroop araştırmasının meta-analizi. Testin dikkat, inhibisyon ve kognitif kontrol ölçümündeki geçerliliğini 700+ çalışmayla doğruladı.',
        pubmedId: 'PMID:2034749',
      },
    ],
  },

  n_back_2: {
    cognitiveFunction: 'Çalışma Belleği & Güncelleme',
    whyItMatters:
      "Beynin bilgiyi anlık olarak tutup yeni gelen bilgiyle sürekli güncelleme kapasitesini zorlar. Akıcı zekanın (fluid intelligence) en güçlü göstergesidir — IQ testleriyle doğrudan korelasyon gösterir.",
    brainRegion: 'Dorsolateral Prefrontal Cortex (DLPFC), Parietal Lob',
    articles: [
      {
        title: 'Age differences in short-term retention of rapidly changing information',
        authors: 'Kirchner, W. K.',
        year: 1958,
        journal: 'Journal of Experimental Psychology',
        summary:
          'N-back paradigmasını ilk tanımlayan tarihi çalışma. Çalışma belleği kapasitesinin yaşla değişimini ve bilişsel yükleme altındaki performans farklılıklarını ortaya koydu.',
        pubmedId: 'doi:10.1037/h0043558',
      },
      {
        title: 'Working memory training improves fluid intelligence',
        authors: 'Jaeggi, S. M., Buschkuehl, M., Jonides, J., & Perrig, W. J.',
        year: 2008,
        journal: 'PNAS',
        summary:
          "N-back antrenmanının sadece görevi iyileştirmekle kalmadığını, genel akıcı zekayı da geliştirdiğini kanıtladı. 'Transfer etkisi' tartışmasını alevlendiren kırılma noktası çalışması.",
        pubmedId: 'PMID:18459395',
      },
    ],
  },

  flanker_incongruent: {
    cognitiveFunction: 'Çatışma Yönetimi & Yürütücü İşlevler',
    whyItMatters:
      "Yanıltıcı sinyaller arasında doğru hedefe odaklanmayı ölçer. Beynin yönetsel ağlarını (executive networks) aktive eder, yaşlanmaya bağlı kognitif yavaşlamayı geciktirir. FINGER çalışmasında en duyarlı testlerden biri.",
    brainRegion: 'Anterior Cingulate Cortex, Prefrontal Korteks',
    articles: [
      {
        title:
          'Effects of noise letters upon the identification of a target letter in a spatial array',
        authors: 'Eriksen, B. A., & Eriksen, C. W.',
        year: 1974,
        journal: 'Perception & Psychophysics',
        summary:
          'Flanker testini dünyaya tanıtan temel makale. Hedef uyarı ile çevre uyarılar arasındaki çatışma etkisini ilk kez sistematik olarak ölçtü. Bilişsel psikolojinin klasiği.',
        pubmedId: 'doi:10.3758/BF03203267',
      },
      {
        title: 'Aging and inhibitory processes: Evidence from the Flanker task',
        authors: 'Fabiani, M., & Friedman, D.',
        year: 1995,
        journal: 'Psychophysiology',
        summary:
          'Yaşlanan beyinde inhibisyon kapasitesinin düştüğünü, Flanker testinin bu düşüşü genç gruplardan 10-15 yıl önce tespit edebildiğini gösterdi.',
        pubmedId: 'PMID:7890006',
      },
    ],
  },

  trail_making_b: {
    cognitiveFunction: 'Zihinsel Esneklik & Motor Hız',
    whyItMatters:
      'Rakamlar ve harfler arasında (1-A-2-B-3-C...) hızlıca geçiş yapmayı gerektirir. Beynin çoklu görev ve görsel tarama hızını doğrudan ölçer. Klinik demans taramalarında en yaygın kullanılan testtir.',
    brainRegion: 'Prefrontal Korteks, Parietal Korteks, Motor Korteks',
    articles: [
      {
        title: 'Validity of the Trail Making Test as an indicator of organic brain damage',
        authors: 'Reitan, R. M.',
        year: 1958,
        journal: 'Perceptual and Motor Skills',
        summary:
          'Trail Making testini nöropsikoloji kliniklerine kazandıran temel çalışma. Beyin hasarı olan hastalarda performansın dramatik biçimde düştüğünü, özellikle TMT-B\'nin kognitif esnekliği ayrışık ölçtüğünü kanıtladı.',
        pubmedId: 'doi:10.2466/pms.1958.8.3.271',
      },
      {
        title: 'Trail Making Test performance predicts cognitive decline in older adults',
        authors: 'Nordlund, A. et al.',
        year: 2010,
        journal: 'Dementia and Geriatric Cognitive Disorders',
        summary:
          'TMT-B performansının Alzheimer gelişimini 3-5 yıl önceden tahmin edebildiğini gösteren prospektif çalışma. Erken taramada altın standart olduğunu doğruladı.',
        pubmedId: 'PMID:20798545',
      },
    ],
  },
}
