/**
 * 位置選択コンポーネント
 * 地図上での位置選択・GPS取得・住所検索機能を提供
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { LocationData, MapRegion, AddressSearchResult } from '@/types/work-sites';
import locationService from '@/lib/location-service';
import addressSearchService from '@/lib/address-search';

interface LocationPickerProps {
  visible: boolean;
  initialLocation?: LocationData;
  onLocationSelected: (location: LocationData) => void;
  onClose: () => void;
}

interface MockMapViewProps {
  region: MapRegion;
  onRegionChangeComplete: (region: MapRegion) => void;
  markerCoordinate?: { latitude: number; longitude: number };
  onPress: (event: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => void;
}

// モック地図コンポーネント（実際の実装ではreact-native-mapsを使用）
const MockMapView: React.FC<MockMapViewProps> = ({
  region,
  onRegionChangeComplete,
  markerCoordinate,
  onPress,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleMapPress = () => {
    // ランダムな位置を生成（デモ用）
    const newCoordinate = {
      latitude: region.latitude + (Math.random() - 0.5) * 0.01,
      longitude: region.longitude + (Math.random() - 0.5) * 0.01,
    };
    
    onPress({
      nativeEvent: {
        coordinate: newCoordinate,
      },
    });
  };

  return (
    <TouchableOpacity
      style={[styles.mockMap, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={handleMapPress}
      activeOpacity={0.8}
    >
      <View style={styles.mapCenter}>
        <Ionicons name="location" size={32} color="#E53E3E" />
      </View>
      
      <View style={styles.mapInfo}>
        <Text style={[styles.mapInfoText, { color: colors.text }]}>
          緯度: {region.latitude.toFixed(6)}
        </Text>
        <Text style={[styles.mapInfoText, { color: colors.text }]}>
          経度: {region.longitude.toFixed(6)}
        </Text>
      </View>
      
      <View style={styles.mapInstructions}>
        <Text style={[styles.instructionText, { color: colors.text }]}>
          タップして位置を設定
        </Text>
      </View>
      
      {markerCoordinate && (
        <View style={styles.markerIndicator}>
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          <Text style={[styles.markerText, { color: colors.text }]}>位置設定済み</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const LocationPicker: React.FC<LocationPickerProps> = ({
  visible,
  initialLocation,
  onLocationSelected,
  onClose,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // 地図の状態
  const [mapRegion, setMapRegion] = useState<MapRegion>({
    latitude: initialLocation?.latitude || 35.6762,
    longitude: initialLocation?.longitude || 139.6503,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  
  // 選択された位置
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(
    initialLocation || null
  );
  
  // 検索関連
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AddressSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // UI状態
  const [loading, setLoading] = useState(false);
  const [gettingCurrentLocation, setGettingCurrentLocation] = useState(false);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // 初期化
  useEffect(() => {
    if (visible && initialLocation) {
      setMapRegion(prev => ({
        ...prev,
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
      }));
      setSelectedLocation(initialLocation);
    }
  }, [visible, initialLocation]);

  // 検索処理（デバウンス）
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery.trim());
      }, 500);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // 住所検索実行
  const performSearch = async (query: string) => {
    try {
      setSearching(true);
      const results = await addressSearchService.searchAddressPredictions(query);
      const addressResults: AddressSearchResult[] = results.map(prediction => ({
        address: prediction.description,
        latitude: 0, // プレディクション段階では座標不明
        longitude: 0,
        place_id: prediction.place_id,
        formatted_address: prediction.description,
      }));
      setSearchResults(addressResults);
      setShowSearchResults(addressResults.length > 0);
    } catch (error) {
      console.error('住所検索エラー:', error);
    } finally {
      setSearching(false);
    }
  };

  // 検索結果選択
  const selectSearchResult = async (result: AddressSearchResult) => {
    try {
      setLoading(true);
      setShowSearchResults(false);
      
      if (result.place_id && result.latitude === 0) {
        // Place IDから詳細を取得
        const placeDetails = await addressSearchService.getPlaceDetails(result.place_id);
        if (placeDetails) {
          const newLocation: LocationData = {
            latitude: placeDetails.latitude,
            longitude: placeDetails.longitude,
            address: placeDetails.formatted_address,
            postal_code: placeDetails.postal_code,
          };
          
          setSelectedLocation(newLocation);
          setMapRegion(prev => ({
            ...prev,
            latitude: placeDetails.latitude,
            longitude: placeDetails.longitude,
          }));
          setSearchQuery(placeDetails.formatted_address);
        }
      } else if (result.latitude !== 0 && result.longitude !== 0) {
        const newLocation: LocationData = {
          latitude: result.latitude,
          longitude: result.longitude,
          address: result.formatted_address || result.address,
          postal_code: result.postal_code,
        };
        
        setSelectedLocation(newLocation);
        setMapRegion(prev => ({
          ...prev,
          latitude: result.latitude,
          longitude: result.longitude,
        }));
        setSearchQuery(result.formatted_address || result.address);
      }
    } catch (error) {
      Alert.alert('エラー', '住所の詳細情報を取得できませんでした');
    } finally {
      setLoading(false);
    }
  };

  // 現在位置取得
  const getCurrentLocation = async () => {
    try {
      setGettingCurrentLocation(true);
      const location = await locationService.getCurrentPosition();
      const geocodeResult = await locationService.reverseGeocode(location.latitude, location.longitude);
      
      const newLocation: LocationData = {
        latitude: location.latitude,
        longitude: location.longitude,
        address: geocodeResult.address,
        postal_code: geocodeResult.postalCode,
        accuracy: location.accuracy,
      };
      
      setSelectedLocation(newLocation);
      setMapRegion(prev => ({
        ...prev,
        latitude: location.latitude,
        longitude: location.longitude,
      }));
      
      if (geocodeResult.address) {
        setSearchQuery(geocodeResult.address);
      }
    } catch (error) {
      Alert.alert('エラー', '現在位置を取得できませんでした');
    } finally {
      setGettingCurrentLocation(false);
    }
  };

  // 地図上の位置選択
  const handleMapPress = async (event: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    try {
      setLoading(true);
      const { coordinate } = event.nativeEvent;
      
      const geocodeResult = await locationService.reverseGeocode(coordinate.latitude, coordinate.longitude);
      
      const newLocation: LocationData = {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        address: geocodeResult.address,
        postal_code: geocodeResult.postalCode,
      };
      
      setSelectedLocation(newLocation);
      
      if (geocodeResult.address) {
        setSearchQuery(geocodeResult.address);
      }
    } catch (error) {
      Alert.alert('エラー', '選択した位置の住所を取得できませんでした');
    } finally {
      setLoading(false);
    }
  };

  // 位置確定
  const confirmLocation = () => {
    if (selectedLocation) {
      onLocationSelected(selectedLocation);
    }
  };

  // モーダル閉じる
  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setSelectedLocation(null);
    onClose();
  };

  const renderSearchResult = ({ item }: { item: AddressSearchResult }) => (
    <TouchableOpacity
      style={[styles.searchResultItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      onPress={() => selectSearchResult(item)}
    >
      <Ionicons name="location-outline" size={20} color={colors.text} />
      <View style={styles.searchResultContent}>
        <Text style={[styles.searchResultAddress, { color: colors.text }]} numberOfLines={1}>
          {item.formatted_address || item.address}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.text} />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* ヘッダー */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>位置を選択</Text>
          <TouchableOpacity
            onPress={getCurrentLocation}
            style={styles.currentLocationButton}
            disabled={gettingCurrentLocation}
          >
            {gettingCurrentLocation ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Ionicons name="locate" size={24} color={colors.text} />
            )}
          </TouchableOpacity>
        </View>

        {/* 検索バー */}
        <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="search" size={20} color={colors.text} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="住所を検索"
              placeholderTextColor={colors.text + '80'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setShowSearchResults(searchResults.length > 0)}
              returnKeyType="search"
            />
            {searching && <ActivityIndicator size="small" color={colors.text} />}
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setShowSearchResults(false);
                }}
              >
                <Ionicons name="close-circle" size={20} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* コンテンツ */}
        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {showSearchResults ? (
            <View style={styles.searchResultsContainer}>
              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item, index) => `${item.place_id || index}`}
                style={styles.searchResultsList}
                keyboardShouldPersistTaps="handled"
              />
            </View>
          ) : (
            <View style={styles.mapContainer}>
              <MockMapView
                region={mapRegion}
                onRegionChangeComplete={setMapRegion}
                markerCoordinate={selectedLocation ? {
                  latitude: selectedLocation.latitude,
                  longitude: selectedLocation.longitude,
                } : undefined}
                onPress={handleMapPress}
              />
              
              {loading && (
                <View style={styles.mapLoadingOverlay}>
                  <ActivityIndicator size="large" color={colors.tint} />
                  <Text style={[styles.loadingText, { color: colors.text }]}>住所を取得中...</Text>
                </View>
              )}
            </View>
          )}
        </KeyboardAvoidingView>

        {/* 選択情報表示 */}
        {selectedLocation && !showSearchResults && (
          <View style={[styles.locationInfo, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <View style={styles.locationDetails}>
              <Text style={[styles.locationTitle, { color: colors.text }]}>選択した位置</Text>
              {selectedLocation.address && (
                <Text style={[styles.locationAddress, { color: colors.text }]} numberOfLines={2}>
                  {selectedLocation.address}
                </Text>
              )}
              <Text style={[styles.locationCoords, { color: colors.text }]}>
                緯度: {selectedLocation.latitude.toFixed(6)}, 経度: {selectedLocation.longitude.toFixed(6)}
              </Text>
              {selectedLocation.accuracy && (
                <Text style={[styles.locationAccuracy, { color: colors.text }]}>
                  精度: ±{Math.round(selectedLocation.accuracy)}m
                </Text>
              )}
            </View>
          </View>
        )}

        {/* ボタン */}
        <View style={[styles.buttonContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              {
                backgroundColor: selectedLocation ? colors.tint : colors.border,
                opacity: selectedLocation ? 1 : 0.5,
              }
            ]}
            onPress={confirmLocation}
            disabled={!selectedLocation}
          >
            <Ionicons name="checkmark" size={20} color="white" />
            <Text style={styles.confirmButtonText}>
              {selectedLocation ? '位置を確定' : '位置を選択してください'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 16,
  },
  currentLocationButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  searchResultsContainer: {
    flex: 1,
  },
  searchResultsList: {
    flex: 1,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchResultContent: {
    flex: 1,
    marginLeft: 12,
  },
  searchResultAddress: {
    fontSize: 16,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mockMap: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    borderWidth: 2,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapCenter: {
    position: 'absolute',
  },
  mapInfo: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  mapInfoText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  mapInstructions: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  instructionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  markerIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(76,175,80,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  markerText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  mapLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  locationInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  locationDetails: {
    gap: 6,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  locationAddress: {
    fontSize: 14,
    lineHeight: 20,
  },
  locationCoords: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  locationAccuracy: {
    fontSize: 12,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LocationPicker;