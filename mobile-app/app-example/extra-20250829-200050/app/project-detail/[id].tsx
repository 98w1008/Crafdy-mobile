import React from 'react'
import { StyleSheet, ScrollView } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'

export default function ProjectDetailModal() {
  const { id } = useLocalSearchParams()
  
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <ThemedView style={styles.header}>
          <ThemedText type="title">Project Details</ThemedText>
          <ThemedText type="subtitle">Project ID: {id}</ThemedText>
        </ThemedView>
        
        <ThemedView style={styles.content}>
          <ThemedText type="defaultSemiBold">Project Information</ThemedText>
          <ThemedText>Detailed project view will be implemented here.</ThemedText>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  content: {
    padding: 20,
    gap: 16,
  },
})