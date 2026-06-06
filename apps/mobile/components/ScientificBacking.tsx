import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Linking } from 'react-native'
import { Colors } from '../constants/colors'
import { GAME_SCIENCE } from '../constants/science'

interface Props {
  gameType: string
}

export function ScientificBacking({ gameType }: Props) {
  const [visible, setVisible] = useState(false)
  const science = GAME_SCIENCE[gameType]

  if (!science) return null

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setVisible(true)}>
        <Text style={styles.triggerIcon}>🔬</Text>
        <View style={styles.triggerContent}>
          <Text style={styles.triggerTitle}>Bilimsel Altyapı</Text>
          <Text style={styles.triggerSub}>{science.cognitiveFunction}</Text>
        </View>
        <Text style={styles.triggerArrow}>›</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Bilimsel Altyapı</Text>
            <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeButton}>
              <Text style={styles.closeText}>Kapat</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.functionCard}>
              <Text style={styles.functionLabel}>Hedeflenen Kognitif Fonksiyon</Text>
              <Text style={styles.functionTitle}>{science.cognitiveFunction}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bu Test Neden Var?</Text>
              <Text style={styles.bodyText}>{science.whyItMatters}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Beyin Bölgesi</Text>
              <View style={styles.regionPill}>
                <Text style={styles.regionText}>{science.brainRegion}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>İlgililere: Bilimsel Referanslar</Text>
              {science.articles.map((article, i) => (
                <View key={i} style={styles.articleCard}>
                  <View style={styles.articleYear}>
                    <Text style={styles.articleYearText}>{article.year}</Text>
                  </View>
                  <View style={styles.articleBody}>
                    <Text style={styles.articleTitle}>"{article.title}"</Text>
                    <Text style={styles.articleAuthors}>
                      {article.authors} — {article.journal}
                    </Text>
                    <Text style={styles.articleSummary}>{article.summary}</Text>
                    {article.pubmedId && (
                      <TouchableOpacity
                        onPress={() =>
                          Linking.openURL(
                            article.pubmedId!.startsWith('doi:')
                              ? `https://doi.org/${article.pubmedId!.replace('doi:', '')}`
                              : `https://pubmed.ncbi.nlm.nih.gov/${article.pubmedId!.replace('PMID:', '')}/`
                          )
                        }
                      >
                        <Text style={styles.pubmedLink}>📄 {article.pubmedId}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.disclaimer}>
              <Text style={styles.disclaimerText}>
                Bu içerik bilgilendirme amaçlıdır. Tıbbi tanı koymaz.
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF9F8',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#B2E8E4',
    gap: 12,
  },
  triggerIcon: { fontSize: 22 },
  triggerContent: { flex: 1 },
  triggerTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  triggerSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  triggerArrow: { fontSize: 20, color: Colors.textMuted },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center',
    gap: 12,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  closeButton: { position: 'absolute', right: 24, top: 28 },
  closeText: { fontSize: 15, color: Colors.accent, fontWeight: '600' },
  modalContent: { paddingHorizontal: 24, paddingVertical: 20, gap: 24, paddingBottom: 48 },
  functionCard: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 18,
    gap: 4,
  },
  functionLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.5 },
  functionTitle: { fontSize: 18, fontWeight: '800', color: Colors.white },
  section: { gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  bodyText: { fontSize: 15, color: Colors.text, lineHeight: 23 },
  regionPill: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignSelf: 'flex-start',
  },
  regionText: { fontSize: 13, color: Colors.text, fontWeight: '500' },
  articleCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  articleYear: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    minWidth: 44,
    alignItems: 'center',
  },
  articleYearText: { fontSize: 12, fontWeight: '800', color: Colors.white },
  articleBody: { flex: 1, gap: 6 },
  articleTitle: { fontSize: 13, fontWeight: '700', color: Colors.primary, lineHeight: 18 },
  articleAuthors: { fontSize: 12, color: Colors.textSecondary, fontStyle: 'italic' },
  articleSummary: { fontSize: 13, color: Colors.text, lineHeight: 19 },
  pubmedLink: { fontSize: 12, color: Colors.accent, fontWeight: '600', marginTop: 2 },
  disclaimer: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  disclaimerText: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
})
