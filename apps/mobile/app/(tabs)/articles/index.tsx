import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Colors } from '../../../constants/colors'
import { useApi } from '../../../hooks/useApi'
import { STATIC_ARTICLES, type Article } from '../../../constants/articles'

const CATEGORIES = [
  { key: 'all', label: 'Tümü' },
  { key: 'attention', label: 'Dikkat' },
  { key: 'working_memory', label: 'Bellek' },
  { key: 'executive_function', label: 'Yürütücü' },
]

const CATEGORY_COLORS: Record<string, string> = {
  general: '#6366F1',
  attention: '#F59E0B',
  working_memory: '#10B981',
  executive_function: '#8B5CF6',
}

function ArticleCard({ article }: { article: Article }) {
  const color = CATEGORY_COLORS[article.category] ?? Colors.accent
  const catLabel = CATEGORIES.find(c => c.key === article.category)?.label ?? article.category

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/(tabs)/articles/[id]', params: { id: article.id } })}
      activeOpacity={0.75}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: color + '18' }]}>
          <Text style={[styles.categoryText, { color }]}>{catLabel}</Text>
        </View>
        <Text style={styles.year}>{article.year}</Text>
      </View>
      <Text style={styles.cardTitle} numberOfLines={3}>{article.title}</Text>
      <Text style={styles.cardAuthors} numberOfLines={1}>{article.authors}</Text>
      <Text style={styles.cardJournal}>{article.journal}</Text>
      <Text style={styles.cardSummary} numberOfLines={3}>{article.user_summary}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.readMore}>Devamını Oku →</Text>
        {article.game_id && (
          <View style={styles.gameBadge}>
            <Ionicons name="game-controller-outline" size={12} color={Colors.accent} />
            <Text style={styles.gameBadgeText}>Oyun bağlantılı</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

export default function ArticlesScreen() {
  const { get } = useApi()
  const [selectedCategory, setSelectedCategory] = useState('all')

  const { data } = useQuery<{ articles: Article[] }>({
    queryKey: ['articles'],
    queryFn: () => get('/articles'),
    retry: false,
  })

  const articles: Article[] = data?.articles?.length ? data.articles : STATIC_ARTICLES
  const generalArticles = articles.filter(a => a.category === 'general')
  const gameArticles = articles.filter(a => a.category !== 'general')
  const filtered = selectedCategory === 'all'
    ? gameArticles
    : articles.filter(a => a.category === selectedCategory)

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Bilimsel Kütüphane</Text>
        <Text style={styles.subtitle}>Uygulamamızın dayandığı hakemli araştırmalar</Text>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={15} color="#6366F1" />
            <Text style={styles.sectionTitle}>Temel Araştırmalar</Text>
          </View>
          {generalArticles.map(a => <ArticleCard key={a.id} article={a} />)}
        </View>

        <View style={styles.filterRow}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.filterChip, selectedCategory === cat.key && styles.filterChipActive]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Text style={[styles.filterText, selectedCategory === cat.key && styles.filterTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flask-outline" size={15} color={Colors.accent} />
            <Text style={[styles.sectionTitle, { color: Colors.accent }]}>Oyun Araştırmaları</Text>
          </View>
          {filtered.map(a => <ArticleCard key={a.id} article={a} />)}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 40, gap: 20 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginTop: 2 },
  section: { gap: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#6366F1', textTransform: 'uppercase', letterSpacing: 0.6 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  filterChipActive: { borderColor: Colors.accent, backgroundColor: Colors.accent + '18' },
  filterText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: Colors.accent, fontWeight: '700' },
  card: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: Colors.border, gap: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  categoryText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  year: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, lineHeight: 22 },
  cardAuthors: { fontSize: 12, color: Colors.textSecondary },
  cardJournal: { fontSize: 12, color: Colors.accent, fontWeight: '600', fontStyle: 'italic' },
  cardSummary: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  readMore: { fontSize: 13, color: Colors.accent, fontWeight: '700' },
  gameBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gameBadgeText: { fontSize: 11, color: Colors.accent },
})
