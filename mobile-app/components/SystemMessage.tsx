import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native'
import { RoleGate } from '@/contexts/AuthContext'

interface ReportData {
  workDate: string
  workMembers: string
  workContent: string
  progressRate: number
  weatherCondition?: string
  safetyNotes?: string
  materialUsed?: string
  nextDayPlan?: string
  createdAt: string
  userName: string
  // Owner-only financial information
  estimatedProfit?: number
  laborCost?: number
  materialCost?: number
  dailyRevenue?: number
}

interface SystemMessageProps {
  type: 'report_summary' | 'system_notification'
  reportData?: ReportData
  title?: string
  message?: string
  onPress?: () => void
}

export default function SystemMessage({
  type,
  reportData,
  title,
  message,
  onPress,
}: SystemMessageProps) {
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      weekday: 'short'
    })
  }

  const renderReportSummary = () => {
    if (!reportData) return null

    return (
      <TouchableOpacity 
        style={styles.reportSummaryContainer}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {/* Header */}
        <View style={styles.reportHeader}>
          <View style={styles.reportIconContainer}>
            <Text style={styles.reportIcon}>📋</Text>
          </View>
          <View style={styles.reportHeaderText}>
            <Text style={styles.reportTitle}>日報が提出されました</Text>
            <Text style={styles.reportSubtitle}>
              {reportData.userName} • {formatTime(reportData.createdAt)}
            </Text>
          </View>
          <View style={styles.reportBadge}>
            <Text style={styles.reportBadgeText}>NEW</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.reportContent}>
          {/* Basic Info Row */}
          <View style={styles.reportInfoRow}>
            <View style={styles.reportInfoItem}>
              <Text style={styles.reportInfoLabel}>作業日</Text>
              <Text style={styles.reportInfoValue}>
                {formatDate(reportData.workDate)}
              </Text>
            </View>
            <View style={styles.reportInfoItem}>
              <Text style={styles.reportInfoLabel}>進捗率</Text>
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>{reportData.progressRate}%</Text>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${reportData.progressRate}%` }
                    ]} 
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Members */}
          <View style={styles.reportSection}>
            <Text style={styles.reportSectionLabel}>👥 作業メンバー</Text>
            <Text style={styles.reportSectionValue}>{reportData.workMembers}</Text>
          </View>

          {/* Work Content */}
          <View style={styles.reportSection}>
            <Text style={styles.reportSectionLabel}>🔨 作業内容</Text>
            <Text style={styles.reportSectionValue} numberOfLines={3}>
              {reportData.workContent}
            </Text>
          </View>

          {/* Optional Information */}
          {reportData.weatherCondition && (
            <View style={styles.reportSection}>
              <Text style={styles.reportSectionLabel}>🌤️ 天候</Text>
              <Text style={styles.reportSectionValue}>{reportData.weatherCondition}</Text>
            </View>
          )}

          {reportData.materialUsed && (
            <View style={styles.reportSection}>
              <Text style={styles.reportSectionLabel}>📦 使用材料</Text>
              <Text style={styles.reportSectionValue} numberOfLines={2}>
                {reportData.materialUsed}
              </Text>
            </View>
          )}

          {reportData.safetyNotes && (
            <View style={styles.reportSection}>
              <Text style={styles.reportSectionLabel}>⛑️ 安全確認</Text>
              <Text style={styles.reportSectionValue} numberOfLines={2}>
                {reportData.safetyNotes}
              </Text>
            </View>
          )}

          {reportData.nextDayPlan && (
            <View style={styles.reportSection}>
              <Text style={styles.reportSectionLabel}>📋 明日の予定</Text>
              <Text style={styles.reportSectionValue} numberOfLines={2}>
                {reportData.nextDayPlan}
              </Text>
            </View>
          )}

          {/* Owner-only Financial Information */}
          <RoleGate role="owner">
            <View style={styles.ownerOnlySection}>
              <View style={styles.ownerSectionHeader}>
                <Text style={styles.ownerSectionIcon}>💰</Text>
                <Text style={styles.ownerSectionTitle}>親方専用情報</Text>
                <View style={styles.ownerBadge}>
                  <Text style={styles.ownerBadgeText}>限定</Text>
                </View>
              </View>

              <View style={styles.financialInfoContainer}>
                {reportData.estimatedProfit !== undefined && (
                  <View style={styles.financialInfoRow}>
                    <Text style={styles.financialLabel}>推定粗利</Text>
                    <Text style={[styles.financialValue, styles.profitValue]}>
                      ¥{reportData.estimatedProfit.toLocaleString()}
                    </Text>
                  </View>
                )}

                {reportData.dailyRevenue !== undefined && (
                  <View style={styles.financialInfoRow}>
                    <Text style={styles.financialLabel}>日次売上</Text>
                    <Text style={styles.financialValue}>
                      ¥{reportData.dailyRevenue.toLocaleString()}
                    </Text>
                  </View>
                )}

                {reportData.laborCost !== undefined && (
                  <View style={styles.financialInfoRow}>
                    <Text style={styles.financialLabel}>人件費</Text>
                    <Text style={[styles.financialValue, styles.costValue]}>
                      ¥{reportData.laborCost.toLocaleString()}
                    </Text>
                  </View>
                )}

                {reportData.materialCost !== undefined && (
                  <View style={styles.financialInfoRow}>
                    <Text style={styles.financialLabel}>材料費</Text>
                    <Text style={[styles.financialValue, styles.costValue]}>
                      ¥{reportData.materialCost.toLocaleString()}
                    </Text>
                  </View>
                )}

                {/* Profit Margin Calculation */}
                {reportData.estimatedProfit !== undefined && reportData.dailyRevenue !== undefined && reportData.dailyRevenue > 0 && (
                  <View style={[styles.financialInfoRow, styles.profitMarginRow]}>
                    <Text style={styles.financialLabel}>粗利率</Text>
                    <Text style={[styles.financialValue, styles.profitMarginValue]}>
                      {((reportData.estimatedProfit / reportData.dailyRevenue) * 100).toFixed(1)}%
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </RoleGate>
        </View>

        {/* Footer */}
        <View style={styles.reportFooter}>
          <Text style={styles.reportFooterText}>
            タップして詳細を表示
          </Text>
          <Text style={styles.reportFooterIcon}>→</Text>
        </View>
      </TouchableOpacity>
    )
  }

  const renderSystemNotification = () => (
    <View style={styles.systemNotificationContainer}>
      <View style={styles.systemIconContainer}>
        <Text style={styles.systemIcon}>ℹ️</Text>
      </View>
      <View style={styles.systemTextContainer}>
        {title && <Text style={styles.systemTitle}>{title}</Text>}
        {message && <Text style={styles.systemMessage}>{message}</Text>}
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      {type === 'report_summary' && renderReportSummary()}
      {type === 'system_notification' && renderSystemNotification()}
    </View>
  )
}

const { width: screenWidth } = Dimensions.get('window')

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  
  // Report Summary Styles
  reportSummaryContainer: {
    width: screenWidth * 0.9,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0F2FE',
    shadowColor: '#0E73E0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F9FF',
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  reportIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#E0F2FE',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reportIcon: {
    fontSize: 20,
  },
  reportHeaderText: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 2,
  },
  reportSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  reportBadge: {
    backgroundColor: '#0E73E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reportBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  reportContent: {
    padding: 16,
  },
  reportInfoRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  reportInfoItem: {
    flex: 1,
    marginRight: 16,
  },
  reportInfoLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  reportInfoValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    color: '#0E73E0',
    fontWeight: 'bold',
    marginRight: 8,
    minWidth: 36,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0E73E0',
    borderRadius: 3,
  },
  reportSection: {
    marginBottom: 12,
  },
  reportSectionLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 4,
  },
  reportSectionValue: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 20,
  },
  reportFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  reportFooterText: {
    fontSize: 12,
    color: '#64748B',
    marginRight: 4,
  },
  reportFooterIcon: {
    fontSize: 12,
    color: '#0E73E0',
    fontWeight: 'bold',
  },

  // Owner-only Financial Information Styles
  ownerOnlySection: {
    marginTop: 16,
    backgroundColor: '#FEF7E6',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F59E0B',
    overflow: 'hidden',
  },
  ownerSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ownerSectionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  ownerSectionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  ownerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ownerBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  financialInfoContainer: {
    padding: 12,
  },
  financialInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  profitMarginRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3E8B8',
    marginBottom: 0,
  },
  financialLabel: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600',
  },
  financialValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#451A03',
  },
  profitValue: {
    color: '#059669',
    fontSize: 15,
  },
  costValue: {
    color: '#DC2626',
  },
  profitMarginValue: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '800',
  },

  // System Notification Styles
  systemNotificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: screenWidth * 0.8,
  },
  systemIconContainer: {
    width: 32,
    height: 32,
    backgroundColor: '#E0F2FE',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  systemIcon: {
    fontSize: 16,
  },
  systemTextContainer: {
    flex: 1,
  },
  systemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 2,
  },
  systemMessage: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
})

// Helper function to create report data from form data
export const createReportData = (
  formData: {
    workDate: string
    workMembers: string
    workContent: string
    progressRate: number
    weatherCondition: string
    safetyNotes: string
    materialUsed: string
    nextDayPlan: string
  },
  userName: string,
  createdAt: string,
  includeFinancials: boolean = false
): ReportData => {
  const baseData: ReportData = {
    workDate: formData.workDate,
    workMembers: formData.workMembers,
    workContent: formData.workContent,
    progressRate: formData.progressRate,
    weatherCondition: formData.weatherCondition || undefined,
    safetyNotes: formData.safetyNotes || undefined,
    materialUsed: formData.materialUsed || undefined,
    nextDayPlan: formData.nextDayPlan || undefined,
    createdAt,
    userName,
  }

  // Add financial calculations for owners
  if (includeFinancials) {
    // Calculate member count from workMembers string
    const memberCount = formData.workMembers.split(/[,、\s]+/).filter(member => member.trim()).length
    
    // Estimate daily labor cost (¥12,000 per person per day)
    const dailyLaborCost = memberCount * 12000
    
    // Estimate material cost based on progress and content
    let materialCost = 0
    if (formData.materialUsed && formData.materialUsed.trim()) {
      // Rough estimation based on materials mentioned
      const materialKeywords = ['コンクリート', '鉄筋', '木材', '資材', '材料']
      const hasExpensiveMaterials = materialKeywords.some(keyword => 
        formData.materialUsed.includes(keyword)
      )
      materialCost = hasExpensiveMaterials ? memberCount * 8000 : memberCount * 3000
    }
    
    // Estimate daily revenue based on progress rate and project scale
    const baseRevenue = memberCount * 25000 // Base revenue per person
    const progressMultiplier = Math.max(0.5, formData.progressRate / 100) // At least 50% of base revenue
    const dailyRevenue = Math.round(baseRevenue * progressMultiplier)
    
    // Calculate estimated profit
    const estimatedProfit = dailyRevenue - dailyLaborCost - materialCost

    baseData.laborCost = dailyLaborCost
    baseData.materialCost = materialCost
    baseData.dailyRevenue = dailyRevenue
    baseData.estimatedProfit = estimatedProfit
  }

  return baseData
}