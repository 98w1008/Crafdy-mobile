/**
 * 位置情報サービス
 * GPS取得、住所変換、位置情報管理機能を提供
 */

import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationData, MapRegion } from '@/types/work-sites';

export interface LocationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: Location.PermissionStatus;
}

export interface GeolocationOptions {
  accuracy?: Location.Accuracy;
  timeout?: number;
  maximumAge?: number;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
}

const LOCATION_CACHE_KEY = 'cached_locations';
const CACHE_EXPIRY_HOURS = 24;

class LocationService {
  private static instance: LocationService;
  private lastKnownLocation: LocationData | null = null;
  private watchSubscription: Location.LocationSubscription | null = null;

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * 位置情報の権限をチェック
   */
  async checkPermissions(): Promise<LocationPermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
      return {
        granted: status === Location.PermissionStatus.GRANTED,
        canAskAgain,
        status
      };
    } catch (error) {
      console.error('位置情報権限チェックエラー:', error);
      return {
        granted: false,
        canAskAgain: true,
        status: Location.PermissionStatus.UNDETERMINED
      };
    }
  }

  /**
   * 位置情報の権限をリクエスト
   */
  async requestPermissions(): Promise<LocationPermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      return {
        granted: status === Location.PermissionStatus.GRANTED,
        canAskAgain,
        status
      };
    } catch (error) {
      console.error('位置情報権限リクエストエラー:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: Location.PermissionStatus.DENIED
      };
    }
  }

  /**
   * 現在位置を取得
   */
  async getCurrentPosition(options?: GeolocationOptions): Promise<LocationData> {
    const permissions = await this.checkPermissions();
    if (!permissions.granted) {
      const requestResult = await this.requestPermissions();
      if (!requestResult.granted) {
        throw new Error('位置情報の権限が許可されていません');
      }
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: options?.accuracy || Location.Accuracy.Balanced,
        timeout: options?.timeout || 15000,
        maximumAge: options?.maximumAge || 60000,
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
      };

      this.lastKnownLocation = locationData;
      await this.cacheLocation(locationData);

      return locationData;
    } catch (error) {
      console.error('現在位置取得エラー:', error);
      
      // キャッシュから最後の位置を取得を試行
      const cachedLocation = await this.getCachedLocation();
      if (cachedLocation) {
        return cachedLocation;
      }
      
      throw new Error('現在位置を取得できませんでした');
    }
  }

  /**
   * 位置情報の監視を開始
   */
  async startWatching(
    callback: (location: LocationData) => void,
    options?: GeolocationOptions
  ): Promise<void> {
    const permissions = await this.checkPermissions();
    if (!permissions.granted) {
      const requestResult = await this.requestPermissions();
      if (!requestResult.granted) {
        throw new Error('位置情報の権限が許可されていません');
      }
    }

    if (this.watchSubscription) {
      this.watchSubscription.remove();
    }

    try {
      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: options?.accuracy || Location.Accuracy.Balanced,
          timeInterval: 10000, // 10秒間隔
          distanceInterval: 10, // 10m移動で更新
        },
        (location) => {
          const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
          };

          this.lastKnownLocation = locationData;
          callback(locationData);
        }
      );
    } catch (error) {
      console.error('位置情報監視エラー:', error);
      throw new Error('位置情報の監視を開始できませんでした');
    }
  }

  /**
   * 位置情報の監視を停止
   */
  stopWatching(): void {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
    }
  }

  /**
   * 座標から住所を取得（逆ジオコーディング）
   */
  async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<GeocodeResult> {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      if (results.length > 0) {
        const result = results[0];
        return {
          latitude,
          longitude,
          address: this.formatAddress(result),
          city: result.city || undefined,
          region: result.region || undefined,
          postalCode: result.postalCode || undefined,
          country: result.country || undefined,
        };
      } else {
        return {
          latitude,
          longitude,
        };
      }
    } catch (error) {
      console.error('逆ジオコーディングエラー:', error);
      return {
        latitude,
        longitude,
      };
    }
  }

  /**
   * 住所から座標を取得（ジオコーディング）
   */
  async geocode(address: string): Promise<GeocodeResult[]> {
    try {
      const results = await Location.geocodeAsync(address);
      return results.map(result => ({
        latitude: result.latitude,
        longitude: result.longitude,
        address,
      }));
    } catch (error) {
      console.error('ジオコーディングエラー:', error);
      return [];
    }
  }

  /**
   * 2点間の距離を計算（メートル）
   */
  calculateDistance(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number }
  ): number {
    const R = 6371e3; // 地球の半径（メートル）
    const φ1 = (from.latitude * Math.PI) / 180;
    const φ2 = (to.latitude * Math.PI) / 180;
    const Δφ = ((to.latitude - from.latitude) * Math.PI) / 180;
    const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // 距離（メートル）
  }

  /**
   * MapRegionを生成
   */
  createMapRegion(
    latitude: number,
    longitude: number,
    radius: number = 1000 // デフォルト1km
  ): MapRegion {
    const latitudeDelta = radius / 111000; // 1度 ≈ 111km
    const longitudeDelta = radius / (111000 * Math.cos(latitude * Math.PI / 180));

    return {
      latitude,
      longitude,
      latitudeDelta,
      longitudeDelta,
    };
  }

  /**
   * 最後に取得した位置情報を返す
   */
  getLastKnownLocation(): LocationData | null {
    return this.lastKnownLocation;
  }

  /**
   * 位置情報をキャッシュ
   */
  private async cacheLocation(location: LocationData): Promise<void> {
    try {
      const cacheData = {
        location,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('位置情報キャッシュエラー:', error);
    }
  }

  /**
   * キャッシュされた位置情報を取得
   */
  private async getCachedLocation(): Promise<LocationData | null> {
    try {
      const cached = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
      if (cached) {
        const { location, timestamp } = JSON.parse(cached);
        const hoursSinceCache = (Date.now() - timestamp) / (1000 * 60 * 60);
        
        if (hoursSinceCache < CACHE_EXPIRY_HOURS) {
          return location;
        }
      }
    } catch (error) {
      console.error('キャッシュ位置情報取得エラー:', error);
    }
    return null;
  }

  /**
   * 住所をフォーマット
   */
  private formatAddress(result: Location.LocationGeocodedAddress): string {
    const parts = [
      result.name,
      result.street,
      result.city,
      result.region,
      result.postalCode,
    ].filter(Boolean);

    return parts.join(' ');
  }

  /**
   * 位置情報サービスが利用可能かチェック
   */
  async isLocationServiceEnabled(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      console.error('位置情報サービス確認エラー:', error);
      return false;
    }
  }

  /**
   * デバイスの設定画面を開く（位置情報設定用）
   */
  async openLocationSettings(): Promise<void> {
    try {
      await Location.requestForegroundPermissionsAsync();
    } catch (error) {
      console.error('設定画面オープンエラー:', error);
    }
  }

  /**
   * リソースのクリーンアップ
   */
  cleanup(): void {
    this.stopWatching();
    this.lastKnownLocation = null;
  }
}

export const locationService = LocationService.getInstance();
export default locationService;