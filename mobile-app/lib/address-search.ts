/**
 * 住所検索API
 * Google Places API（モック）および逆引き検索機能を提供
 */

import { AddressSearchResult } from '@/types/work-sites';
import locationService from './location-service';

export interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  postal_code?: string;
  prefecture?: string;
  city?: string;
  address_components: {
    long_name: string;
    short_name: string;
    types: string[];
  }[];
  types: string[];
}

export interface SearchPrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
}

class AddressSearchService {
  private static instance: AddressSearchService;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api/place';
  private readonly geocodeUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
  // 本番環境では環境変数から取得
  private readonly apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'DEMO_KEY';

  static getInstance(): AddressSearchService {
    if (!AddressSearchService.instance) {
      AddressSearchService.instance = new AddressSearchService();
    }
    return AddressSearchService.instance;
  }

  /**
   * 住所の自動補完検索（モック実装）
   */
  async searchAddressPredictions(query: string): Promise<SearchPrediction[]> {
    if (!query || query.length < 2) {
      return [];
    }

    // モックデータ（実際の実装では Google Places API を呼び出し）
    if (this.apiKey === 'DEMO_KEY') {
      return this.getMockPredictions(query);
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/autocomplete/json?input=${encodeURIComponent(query)}&types=address&components=country:jp&language=ja&key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error('住所検索APIリクエストエラー');
      }

      const data = await response.json();

      if (data.status === 'OK') {
        return data.predictions.map((prediction: any) => ({
          place_id: prediction.place_id,
          description: prediction.description,
          structured_formatting: {
            main_text: prediction.structured_formatting.main_text,
            secondary_text: prediction.structured_formatting.secondary_text || '',
          },
          types: prediction.types,
        }));
      }

      return [];
    } catch (error) {
      console.error('住所検索エラー:', error);
      return this.getMockPredictions(query);
    }
  }

  /**
   * Place IDから詳細情報を取得（モック実装）
   */
  async getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    // モックデータ
    if (this.apiKey === 'DEMO_KEY') {
      return this.getMockPlaceDetails(placeId);
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/details/json?place_id=${placeId}&fields=place_id,name,formatted_address,geometry,address_components,types&language=ja&key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error('Place詳細APIリクエストエラー');
      }

      const data = await response.json();

      if (data.status === 'OK' && data.result) {
        const result = data.result;
        const location = result.geometry.location;
        
        return {
          place_id: result.place_id,
          name: result.name || '',
          formatted_address: result.formatted_address,
          latitude: location.lat,
          longitude: location.lng,
          postal_code: this.extractAddressComponent(result.address_components, 'postal_code'),
          prefecture: this.extractAddressComponent(result.address_components, 'administrative_area_level_1'),
          city: this.extractAddressComponent(result.address_components, 'locality'),
          address_components: result.address_components,
          types: result.types,
        };
      }

      return null;
    } catch (error) {
      console.error('Place詳細取得エラー:', error);
      return this.getMockPlaceDetails(placeId);
    }
  }

  /**
   * 住所文字列で座標を検索
   */
  async geocodeAddress(address: string): Promise<AddressSearchResult[]> {
    try {
      // まず Expo Location のジオコーディングを試行
      const results = await locationService.geocode(address);
      
      if (results.length > 0) {
        return results.map((result, index) => ({
          address: result.address || address,
          latitude: result.latitude,
          longitude: result.longitude,
          place_id: `expo_${index}`,
          formatted_address: result.address || address,
          postal_code: result.postalCode,
        }));
      }

      // フォールバック: モックデータ
      return this.getMockGeocodeResults(address);
    } catch (error) {
      console.error('ジオコーディングエラー:', error);
      return this.getMockGeocodeResults(address);
    }
  }

  /**
   * 座標から住所を検索（逆ジオコーディング）
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<AddressSearchResult | null> {
    try {
      // Expo Location の逆ジオコーディングを使用
      const result = await locationService.reverseGeocode(latitude, longitude);
      
      if (result.address) {
        return {
          address: result.address,
          latitude: result.latitude,
          longitude: result.longitude,
          formatted_address: result.address,
          postal_code: result.postalCode,
        };
      }

      return null;
    } catch (error) {
      console.error('逆ジオコーディングエラー:', error);
      return null;
    }
  }

  /**
   * 現在位置の住所を取得
   */
  async getCurrentLocationAddress(): Promise<AddressSearchResult | null> {
    try {
      const currentLocation = await locationService.getCurrentPosition();
      return await this.reverseGeocode(currentLocation.latitude, currentLocation.longitude);
    } catch (error) {
      console.error('現在位置住所取得エラー:', error);
      return null;
    }
  }

  /**
   * 郵便番号から住所を検索（モック実装）
   */
  async searchByPostalCode(postalCode: string): Promise<AddressSearchResult[]> {
    const cleanedCode = postalCode.replace(/[^0-9]/g, '');
    
    if (cleanedCode.length !== 7) {
      return [];
    }

    // モックデータ
    const mockResults = [
      {
        address: '東京都渋谷区神宮前',
        latitude: 35.6702,
        longitude: 139.7024,
        place_id: `postal_${cleanedCode}`,
        formatted_address: `〒${cleanedCode.slice(0, 3)}-${cleanedCode.slice(3)} 東京都渋谷区神宮前`,
        postal_code: cleanedCode,
      }
    ];

    return mockResults;
  }

  /**
   * 住所の候補をモック生成
   */
  private getMockPredictions(query: string): SearchPrediction[] {
    const mockPredictions: SearchPrediction[] = [
      {
        place_id: `mock_${query}_1`,
        description: `${query}1-1-1`,
        structured_formatting: {
          main_text: `${query}1-1-1`,
          secondary_text: '東京都',
        },
        types: ['street_address'],
      },
      {
        place_id: `mock_${query}_2`,
        description: `${query}2-2-2`,
        structured_formatting: {
          main_text: `${query}2-2-2`,
          secondary_text: '東京都',
        },
        types: ['street_address'],
      },
      {
        place_id: `mock_${query}_3`,
        description: `${query}3-3-3`,
        structured_formatting: {
          main_text: `${query}3-3-3`,
          secondary_text: '神奈川県',
        },
        types: ['street_address'],
      },
    ];

    return mockPredictions;
  }

  /**
   * Place詳細のモック生成
   */
  private getMockPlaceDetails(placeId: string): PlaceDetails {
    const mockLat = 35.6762 + (Math.random() - 0.5) * 0.1;
    const mockLng = 139.6503 + (Math.random() - 0.5) * 0.1;

    return {
      place_id: placeId,
      name: 'サンプル住所',
      formatted_address: '東京都渋谷区神宮前1-1-1',
      latitude: mockLat,
      longitude: mockLng,
      postal_code: '150-0001',
      prefecture: '東京都',
      city: '渋谷区',
      address_components: [
        {
          long_name: '1',
          short_name: '1',
          types: ['premise'],
        },
        {
          long_name: '1',
          short_name: '1',
          types: ['sublocality_level_4'],
        },
        {
          long_name: '神宮前',
          short_name: '神宮前',
          types: ['sublocality_level_2'],
        },
        {
          long_name: '渋谷区',
          short_name: '渋谷区',
          types: ['locality'],
        },
        {
          long_name: '東京都',
          short_name: '東京都',
          types: ['administrative_area_level_1'],
        },
        {
          long_name: '150-0001',
          short_name: '150-0001',
          types: ['postal_code'],
        },
      ],
      types: ['street_address'],
    };
  }

  /**
   * ジオコーディング結果のモック生成
   */
  private getMockGeocodeResults(address: string): AddressSearchResult[] {
    return [
      {
        address,
        latitude: 35.6762 + (Math.random() - 0.5) * 0.1,
        longitude: 139.6503 + (Math.random() - 0.5) * 0.1,
        place_id: `mock_geocode_${Date.now()}`,
        formatted_address: address,
      },
    ];
  }

  /**
   * 住所コンポーネントから特定のタイプの値を抽出
   */
  private extractAddressComponent(
    components: any[],
    type: string
  ): string | undefined {
    const component = components.find(comp => comp.types.includes(type));
    return component?.long_name;
  }

  /**
   * 検索履歴をキャッシュに保存
   */
  async saveSearchHistory(searchResult: AddressSearchResult): Promise<void> {
    try {
      // AsyncStorageに検索履歴を保存（実装は省略）
      console.log('検索履歴保存:', searchResult);
    } catch (error) {
      console.error('検索履歴保存エラー:', error);
    }
  }

  /**
   * 検索履歴を取得
   */
  async getSearchHistory(): Promise<AddressSearchResult[]> {
    try {
      // AsyncStorageから検索履歴を取得（実装は省略）
      return [];
    } catch (error) {
      console.error('検索履歴取得エラー:', error);
      return [];
    }
  }

  /**
   * 住所の妥当性を検証
   */
  validateAddress(address: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!address || address.trim().length === 0) {
      errors.push('住所を入力してください');
    } else if (address.trim().length < 5) {
      errors.push('住所が短すぎます');
    }

    // 日本の住所パターンチェック（簡易）
    const japaneseAddressPattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    if (address && !japaneseAddressPattern.test(address)) {
      errors.push('日本語の住所を入力してください');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 郵便番号の妥当性を検証
   */
  validatePostalCode(postalCode: string): { isValid: boolean; formatted: string } {
    const cleaned = postalCode.replace(/[^0-9]/g, '');
    
    if (cleaned.length === 7) {
      return {
        isValid: true,
        formatted: `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`,
      };
    }

    return {
      isValid: false,
      formatted: postalCode,
    };
  }
}

export const addressSearchService = AddressSearchService.getInstance();
export default addressSearchService;