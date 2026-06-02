import { query } from './client.js'

await query(`
  CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    authors TEXT NOT NULL,
    year INTEGER NOT NULL,
    journal TEXT NOT NULL,
    doi_link TEXT,
    category TEXT NOT NULL,
    game_id TEXT,
    user_summary TEXT NOT NULL,
    academic_abstract TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`)

const articles = [
  {
    id: 'finger-2015',
    title: 'A 2 year multidomain intervention of diet, exercise, cognitive training, and vascular risk monitoring versus control to prevent cognitive decline in at-risk elderly people (FINGER)',
    authors: 'Ngandu T, Lehtisalo J, Solomon A, et al.',
    year: 2015,
    journal: 'The Lancet',
    doi_link: 'https://doi.org/10.1016/S0140-6736(15)60461-5',
    category: 'general',
    game_id: null,
    user_summary: 'Demans ve bilişsel gerileme kader değildir. Dünyaca ünlü FINGER çalışması, sadece diyet, egzersiz ve kognitif antrenmanları birleştirerek beynin yaşlanma hızının bilimsel olarak yavaşlatılabileceğini kanıtlayan ilk büyük çaplı araştırmadır. Bizim uygulamamızın temel felsefesi bu araştırmaya dayanır.',
    academic_abstract: 'A randomized controlled trial of 1,260 at-risk older adults showed that a 2-year multidomain intervention (diet, exercise, cognitive training, and vascular monitoring) significantly improved or maintained cognitive performance compared to general health advice, demonstrating that lifestyle interventions can prevent cognitive decline.',
  },
  {
    id: 'stern-cognitive-reserve-2012',
    title: 'Cognitive reserve in ageing and Alzheimer\'s disease',
    authors: 'Stern Y',
    year: 2012,
    journal: 'The Lancet Neurology',
    doi_link: 'https://doi.org/10.1016/S1474-4422(12)70191-6',
    category: 'general',
    game_id: null,
    user_summary: 'Neden bazı insanların beyni yaşlansa da hafızaları güçlü kalır? Bu makale "Bilişsel Rezerv" kavramını açıklar. Zihninizi ne kadar çok zorlar ve yeni şeyler öğrenirseniz, beyninizde o kadar çok yedek nöral yol (rezerv) oluşur. Bu yedek yollar, gelecekteki Alzheimer riskine karşı en büyük kalkanınızdır.',
    academic_abstract: 'Cognitive reserve refers to the mind\'s resilience to neuropathological damage. Individuals with greater cognitive reserve show less clinical manifestation of Alzheimer pathology. Education, occupational complexity, and cognitively stimulating leisure activities all contribute to building reserve, suggesting that active cognitive engagement throughout life provides protection against dementia.',
  },
  {
    id: 'lancet-commission-2020',
    title: 'Dementia prevention, intervention, and care: 2020 report of the Lancet Commission',
    authors: 'Livingston G, Huntley J, Sommerlad A, et al.',
    year: 2020,
    journal: 'The Lancet',
    doi_link: 'https://doi.org/10.1016/S0140-6736(20)30367-6',
    category: 'general',
    game_id: null,
    user_summary: 'Alzheimer vakalarının en az %40\'ı, yaşam tarzı değişiklikleriyle önlenebilir. The Lancet Komisyonu\'nun raporu, zihinsel olarak inaktif kalmanın en büyük risk faktörlerinden biri olduğunu vurguluyor. Erken yaşta başlanan bilişsel eğitim, bu riski minimize eder.',
    academic_abstract: 'The 2020 Lancet Commission identified 12 potentially modifiable risk factors for dementia — including physical inactivity, excessive alcohol use, and cognitive inactivity — collectively accounting for around 40% of worldwide dementias. The report concludes that prevention and early intervention across the life course represent the most powerful tools against dementia.',
  },
  {
    id: 'stroop-1935',
    title: 'Studies of interference in serial verbal reactions',
    authors: 'Stroop JR',
    year: 1935,
    journal: 'Journal of Experimental Psychology',
    doi_link: 'https://doi.org/10.1037/h0054651',
    category: 'attention',
    game_id: 'stroop',
    user_summary: 'Bu test, beyninizin ön lobunda yer alan "Yürütücü Kontrol" merkezini zorlar. Renk ve kelime arasındaki çatışma (örneğin mavi renkle yazılmış KIRMIZI kelimesi), beyninizi alakasız bilgileri filtrelemeye (İnhibisyon) zorlar. Bilimsel araştırmalar, yaşlanmayla birlikte ilk zayıflayan yeteneğin bu filtreleme olduğunu gösteriyor. Stroop ile beyninizin dikkat frenlerini güçlendirirsiniz.',
    academic_abstract: 'Stroop\'s landmark 1935 study demonstrated that humans are significantly slower to name the ink color of color words when the word meaning conflicts with the ink color. This "Stroop Effect" revealed fundamental mechanisms of selective attention and executive control, showing that automatic processes (reading) compete with controlled processes (color naming) within the prefrontal cortex.',
  },
  {
    id: 'jaeggi-nback-2008',
    title: 'Improving fluid intelligence with training on working memory',
    authors: 'Jaeggi SM, Buschkuehl M, Jonides J, Perrig WJ',
    year: 2008,
    journal: 'PNAS',
    doi_link: 'https://doi.org/10.1073/pnas.0801268105',
    category: 'working_memory',
    game_id: 'n_back',
    user_summary: 'N-Back testi, sıradan bir hafıza oyunu değildir; beynin RAM\'ini (Çalışma Belleğini) sürekli güncelleyen altın standart bir laboratuvar testidir. 2008 yılında yapılan meşhur çalışma, N-Back antrenmanlarının sadece hafızayı değil, aynı zamanda yeni problemler çözme yeteneğimizi (Akıcı Zeka) doğrudan artırdığını kanıtlamıştır.',
    academic_abstract: 'In a randomized controlled study, participants trained on the dual n-back task showed significant gains in fluid intelligence (measured by Gf tests) proportional to the amount of training. This was the first demonstration that fluid intelligence — long considered fixed — could be improved through targeted cognitive training, establishing n-back as the gold standard for working memory intervention research.',
  },
  {
    id: 'eriksen-flanker-1974',
    title: 'Effects of noise letters upon the identification of a target letter in a spatial array',
    authors: 'Eriksen BA, Eriksen CW',
    year: 1974,
    journal: 'Perception & Psychophysics',
    doi_link: 'https://doi.org/10.3758/BF03203267',
    category: 'attention',
    game_id: 'flanker',
    user_summary: 'Gürültülü bir kafede karşınızdaki kişinin sesine nasıl odaklanırsınız? Flanker testi tam olarak bu mekanizmayı çalıştırır. Etraftaki çeldirici oklara rağmen merkezdeki hedefe odaklanmak, beynin "Seçici Dikkat" ağlarını ateşler. Bu antrenman, nöral yollarınızdaki sinyal/gürültü oranını iyileştirir.',
    academic_abstract: 'The Eriksen Flanker Task revealed that irrelevant surrounding stimuli (flankers) influence response to a central target, demonstrating that selective attention cannot fully suppress competing information. Response time is slower and more error-prone when flankers are incompatible with the target, making this a key measure of attentional filtering and inhibitory control.',
  },
  {
    id: 'reitan-trail-1958',
    title: 'Validity of the Trail Making Test as an indicator of organic brain damage',
    authors: 'Reitan RM',
    year: 1958,
    journal: 'Perceptual and Motor Skills',
    doi_link: 'https://doi.org/10.2466/pms.1958.8.3.271',
    category: 'executive_function',
    game_id: 'trail_making',
    user_summary: 'Harfler ve sayılar arasında hızla geçiş yapmak (1-A-2-B...), beynin en üst düzey becerilerinden biri olan "Bilişsel Esnekliği" (Cognitive Flexibility) ölçer. Trail Making Testi, klinik nörolojide on yıllardır demans taramasında kullanılan bir klasiktir. Bu oyunda hızlanmanız, beyninizin çoklu görev (multitasking) kapasitesinin korunduğunun en büyük göstergesidir.',
    academic_abstract: 'Reitan\'s validation study established the Trail Making Test as a sensitive neuropsychological instrument detecting organic brain damage. Part B — alternating between numbers and letters — specifically measures cognitive flexibility, visual scanning, and executive function. It remains one of the most widely used screening tools in clinical neurology and dementia assessment.',
  },
]

for (const a of articles) {
  await query(
    `INSERT INTO articles (id, title, authors, year, journal, doi_link, category, game_id, user_summary, academic_abstract)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (id) DO NOTHING`,
    [a.id, a.title, a.authors, a.year, a.journal, a.doi_link, a.category, a.game_id, a.user_summary, a.academic_abstract]
  )
}

console.log('✅ Articles migration complete')
process.exit(0)
