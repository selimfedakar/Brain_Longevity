import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams, router } from 'expo-router'
import { Colors } from '../../../constants/colors'
import { useApi } from '../../../hooks/useApi'
import { STATIC_ARTICLES, type Article } from '../../../constants/articles'

const CATEGORY_COLORS: Record<string, string> = {
  general: '#6366F1',
  attention: '#F59E0B',
  working_memory: '#10B981',
  executive_function: '#8B5CF6',
  processing_speed: '#EF4444',
}

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { get } = useApi()

  const { data: article, isLoading } = useQuery<Article>({
    queryKey: ['article', id],
    queryFn: async () => {
      try { return await get(`/articles/${id}`) } catch { return null }
    },
    enabled: !!id,
    select: (data) => data ?? STATIC_ARTICLES.find(a => a.id === id) ?? null,
  })

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ActivityIndicator color={Colors.accent} style={{ marginTop: 60 }} />
      </SafeAreaView>
    )
  }

  if (!article) return null

  const categoryColor = CATEGORY_COLORS[article.category] ?? Colors.accent

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Araştırma</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '18' }]}>
          <Text style={[styles.categoryText, { color: categoryColor }]}>
            {article.category.replace('_', ' ').toUpperCase()}
          </Text>
        </View>

        <Text style={styles.title}>{article.title}</Text>

        <View style={styles.meta}>
          <Text style={styles.authors}>{article.authors}</Text>
          <Text style={styles.journalYear}>{article.journal} · {article.year}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.block}>
          <View style={styles.blockHeader}>
            <Ionicons name="bulb-outline" size={18} color={Colors.accent} />
            <Text style={styles.blockTitle}>Bu araştırma bize ne söylüyor?</Text>
          </View>
          <Text style={styles.userSummary}>{article.user_summary}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.block}>
          <View style={styles.blockHeader}>
            <Ionicons name="document-text-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.blockTitle}>Akademik Özet</Text>
          </View>
          <Text style={styles.abstract}>{article.academic_abstract}</Text>
        </View>

        {article.doi_link && (
          <TouchableOpacity
            style={styles.doiBtn}
            onPress={() => Linking.openURL(article.doi_link!)}
            activeOpacity={0.8}
          >
            <Ionicons name="open-outline" size={16} color="#fff" />
            <Text style={styles.doiBtnText}>Orijinal Makaleyi Aç (DOI)</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.disclaimer}>
          Bu içerik yalnızca bilgilendirme amaçlıdır. Klinik karar için doktorunuza danışınız.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  scroll: { padding: 20, paddingBottom: 48 },
  categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 12 },
  categoryText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text, lineHeight: 30, marginBottom: 14 },
  meta: { gap: 4, marginBottom: 20 },
  authors: { fontSize: 13, color: Colors.textSecondary },
  journalYear: { fontSize: 13, color: Colors.accent, fontWeight: '600', fontStyle: 'italic' },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 20 },
  block: { gap: 12 },
  blockHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  blockTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  userSummary: { fontSize: 16, color: Colors.text, lineHeight: 26, fontWeight: '500' },
  abstract: { fontSize: 14, color: Colors.textSecondary, lineHeight: 24 },
  doiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center',
    backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 14, marginTop: 28,
  },
  doiBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  disclaimer: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginTop: 20, lineHeight: 18 },
})
