/**
 * 位置情報サービスのテスト
 * Jest
 */

import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import locationService from '@/lib/location-service';

// モック設定
jest.mock('expo-location');
jest.mock('@react-native-async-storage/async-storage');

const mockLocation = Location as jest.Mocked<typeof Location>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('LocationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    locationService.cleanup();
  });

  describe('権限管理', () => {
    it('権限をチェックできる', async () => {
      mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });

      const result = await locationService.checkPermissions();

      expect(result).toEqual({
        granted: true,
        canAskAgain: true,
        status: Location.PermissionStatus.GRANTED,
      });
    });

    it('権限をリクエストできる', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });

      const result = await locationService.requestPermissions();

      expect(result).toEqual({
        granted: true,
        canAskAgain: true,
        status: Location.PermissionStatus.GRANTED,
      });
    });

    it('権限が拒否された場合の処理', async () => {
      mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
        status: Location.PermissionStatus.DENIED,
        granted: false,
        canAskAgain: false,
        expires: 'never',
      });

      const result = await locationService.checkPermissions();

      expect(result.granted).toBe(false);
      expect(result.status).toBe(Location.PermissionStatus.DENIED);
    });
  });

  describe('現在位置取得', () => {
    it('現在位置を取得できる', async () => {
      mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });

      mockLocation.getCurrentPositionAsync.mockResolvedValue({
        coords: {
          latitude: 35.6762,
          longitude: 139.6503,
          altitude: null,
          accuracy: 10,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      });

      const result = await locationService.getCurrentPosition();

      expect(result).toEqual({
        latitude: 35.6762,
        longitude: 139.6503,
        accuracy: 10,
      });
    });

    it('権限がない場合は自動的にリクエストする', async () => {
      mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
        status: Location.PermissionStatus.UNDETERMINED,
        granted: false,
        canAskAgain: true,
        expires: 'never',
      });

      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });

      mockLocation.getCurrentPositionAsync.mockResolvedValue({
        coords: {
          latitude: 35.6762,
          longitude: 139.6503,
          altitude: null,
          accuracy: 10,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      });

      const result = await locationService.getCurrentPosition();

      expect(mockLocation.requestForegroundPermissionsAsync).toHaveBeenCalled();
      expect(result.latitude).toBe(35.6762);
      expect(result.longitude).toBe(139.6503);
    });

    it('位置情報取得に失敗した場合はキャッシュから取得', async () => {
      mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });

      mockLocation.getCurrentPositionAsync.mockRejectedValue(new Error('Location error'));

      const cachedLocation = {
        location: {
          latitude: 35.6762,
          longitude: 139.6503,
          accuracy: 15,
        },
        timestamp: Date.now() - 30000, // 30秒前
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedLocation));

      const result = await locationService.getCurrentPosition();

      expect(result).toEqual(cachedLocation.location);
    });

    it('権限が拒否された場合はエラーを投げる', async () => {
      mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
        status: Location.PermissionStatus.DENIED,
        granted: false,
        canAskAgain: false,
        expires: 'never',
      });

      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: Location.PermissionStatus.DENIED,
        granted: false,
        canAskAgain: false,
        expires: 'never',
      });

      await expect(locationService.getCurrentPosition()).rejects.toThrow(
        '位置情報の権限が許可されていません'
      );
    });

    it('カスタムオプションで位置を取得できる', async () => {
      mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });

      mockLocation.getCurrentPositionAsync.mockResolvedValue({
        coords: {
          latitude: 35.6762,
          longitude: 139.6503,
          altitude: null,
          accuracy: 5,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      });

      const options = {
        accuracy: Location.Accuracy.High,
        timeout: 10000,
        maximumAge: 30000,
      };

      await locationService.getCurrentPosition(options);

      expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalledWith({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
        maximumAge: 30000,
      });
    });
  });

  describe('逆ジオコーディング', () => {
    it('座標から住所を取得できる', async () => {
      const mockResult = [
        {
          city: '渋谷区',
          region: '東京都',
          postalCode: '150-0001',
          country: '日本',
          name: '神宮前',
          street: '1-1-1',
        },
      ];

      mockLocation.reverseGeocodeAsync.mockResolvedValue(mockResult);

      const result = await locationService.reverseGeocode(35.6762, 139.6503);

      expect(result).toEqual({
        latitude: 35.6762,
        longitude: 139.6503,
        address: '神宮前 1-1-1 渋谷区 東京都 150-0001',
        city: '渋谷区',
        region: '東京都',
        postalCode: '150-0001',
        country: '日本',
      });
    });

    it('住所が見つからない場合は座標のみ返す', async () => {
      mockLocation.reverseGeocodeAsync.mockResolvedValue([]);

      const result = await locationService.reverseGeocode(35.6762, 139.6503);

      expect(result).toEqual({
        latitude: 35.6762,
        longitude: 139.6503,
      });
    });

    it('エラーが発生した場合は座標のみ返す', async () => {
      mockLocation.reverseGeocodeAsync.mockRejectedValue(new Error('Geocoding error'));

      const result = await locationService.reverseGeocode(35.6762, 139.6503);

      expect(result).toEqual({
        latitude: 35.6762,
        longitude: 139.6503,
      });
    });
  });

  describe('ジオコーディング', () => {
    it('住所から座標を取得できる', async () => {
      const mockResult = [
        {
          latitude: 35.6762,
          longitude: 139.6503,
        },
        {
          latitude: 35.6763,
          longitude: 139.6504,
        },
      ];

      mockLocation.geocodeAsync.mockResolvedValue(mockResult);

      const result = await locationService.geocode('東京都渋谷区神宮前');

      expect(result).toEqual([
        {
          latitude: 35.6762,
          longitude: 139.6503,
          address: '東京都渋谷区神宮前',
        },
        {
          latitude: 35.6763,
          longitude: 139.6504,
          address: '東京都渋谷区神宮前',
        },
      ]);
    });

    it('エラーが発生した場合は空配列を返す', async () => {
      mockLocation.geocodeAsync.mockRejectedValue(new Error('Geocoding error'));

      const result = await locationService.geocode('存在しない住所');

      expect(result).toEqual([]);
    });
  });

  describe('距離計算', () => {
    it('2点間の距離を正しく計算する', () => {
      const from = { latitude: 35.6762, longitude: 139.6503 };
      const to = { latitude: 35.6812, longitude: 139.6553 };

      const distance = locationService.calculateDistance(from, to);

      // 約700メートルの距離（許容誤差: ±50m）
      expect(distance).toBeGreaterThan(650);
      expect(distance).toBeLessThan(750);
    });

    it('同じ座標の場合は距離0を返す', () => {
      const coordinate = { latitude: 35.6762, longitude: 139.6503 };

      const distance = locationService.calculateDistance(coordinate, coordinate);

      expect(distance).toBe(0);
    });
  });

  describe('MapRegion生成', () => {
    it('座標から適切なMapRegionを生成する', () => {
      const region = locationService.createMapRegion(35.6762, 139.6503, 1000);

      expect(region.latitude).toBe(35.6762);
      expect(region.longitude).toBe(139.6503);
      expect(region.latitudeDelta).toBeCloseTo(0.009, 3);
      expect(region.longitudeDelta).toBeGreaterThan(0);
    });

    it('デフォルト半径でMapRegionを生成する', () => {
      const region = locationService.createMapRegion(35.6762, 139.6503);

      expect(region.latitude).toBe(35.6762);
      expect(region.longitude).toBe(139.6503);
      expect(region.latitudeDelta).toBeCloseTo(0.009, 3);
    });
  });

  describe('位置情報監視', () => {
    it('位置情報の監視を開始できる', async () => {
      const mockSubscription = {
        remove: jest.fn(),
      };

      mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });

      mockLocation.watchPositionAsync.mockResolvedValue(mockSubscription as any);

      const callback = jest.fn();
      await locationService.startWatching(callback);

      expect(mockLocation.watchPositionAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000,
          distanceInterval: 10,
        }),
        expect.any(Function)
      );
    });

    it('監視を停止できる', async () => {
      const mockSubscription = {
        remove: jest.fn(),
      };

      mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });

      mockLocation.watchPositionAsync.mockResolvedValue(mockSubscription as any);

      const callback = jest.fn();
      await locationService.startWatching(callback);

      locationService.stopWatching();

      expect(mockSubscription.remove).toHaveBeenCalled();
    });
  });

  describe('キャッシュ機能', () => {
    it('位置情報がキャッシュされる', async () => {
      mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });

      mockLocation.getCurrentPositionAsync.mockResolvedValue({
        coords: {
          latitude: 35.6762,
          longitude: 139.6503,
          altitude: null,
          accuracy: 10,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      });

      await locationService.getCurrentPosition();

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'cached_locations',
        expect.stringContaining('35.6762')
      );
    });

    it('期限切れのキャッシュは使用されない', async () => {
      const expiredCache = {
        location: {
          latitude: 35.6762,
          longitude: 139.6503,
          accuracy: 15,
        },
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25時間前
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(expiredCache));
      mockLocation.getCurrentPositionAsync.mockRejectedValue(new Error('Location error'));

      await expect(locationService.getCurrentPosition()).rejects.toThrow();
    });
  });

  describe('最後の位置情報', () => {
    it('最後に取得した位置情報を取得できる', async () => {
      mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });

      mockLocation.getCurrentPositionAsync.mockResolvedValue({
        coords: {
          latitude: 35.6762,
          longitude: 139.6503,
          altitude: null,
          accuracy: 10,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      });

      await locationService.getCurrentPosition();

      const lastLocation = locationService.getLastKnownLocation();

      expect(lastLocation).toEqual({
        latitude: 35.6762,
        longitude: 139.6503,
        accuracy: 10,
      });
    });

    it('位置情報を取得していない場合はnullを返す', () => {
      const lastLocation = locationService.getLastKnownLocation();
      expect(lastLocation).toBeNull();
    });
  });

  describe('位置情報サービスの状態', () => {
    it('位置情報サービスの有効性をチェックできる', async () => {
      mockLocation.hasServicesEnabledAsync.mockResolvedValue(true);

      const isEnabled = await locationService.isLocationServiceEnabled();

      expect(isEnabled).toBe(true);
    });

    it('エラーが発生した場合はfalseを返す', async () => {
      mockLocation.hasServicesEnabledAsync.mockRejectedValue(new Error('Service error'));

      const isEnabled = await locationService.isLocationServiceEnabled();

      expect(isEnabled).toBe(false);
    });
  });

  describe('クリーンアップ', () => {
    it('リソースを正しくクリーンアップする', () => {
      locationService.cleanup();

      const lastLocation = locationService.getLastKnownLocation();
      expect(lastLocation).toBeNull();
    });
  });
});