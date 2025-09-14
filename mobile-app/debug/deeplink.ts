import * as Linking from 'expo-linking';
import { router } from 'expo-router';

/**
 * 開発用: Expo Go 上で "clafdi://..." を擬似的に処理する
 * 使い方: チャットで /dl <URL> を送る → main-chat が intent 付きで開く
 */
export function debugOpen(rawUrl: string) {
  try {
    const { path, queryParams } = Linking.parse(rawUrl);
    // 例: clafdi://invoice/create?project=... → intent=create_invoice
    let intent =
      (queryParams?.intent as string) ||
      (path?.includes('invoice') ? 'create_invoice'
        : path?.includes('estimate') ? 'optimize_estimate'
        : path?.includes('report') ? 'create_report'
        : path?.includes('receipt') || path?.includes('upload') ? 'upload_doc'
        : path?.includes('site') ? 'open_site_manager'
        : '');

    const project = (queryParams?.project as string) || undefined;

    // 既存の _layout / main-chat が intent をクエリで受けてSheetを開く前提
    router.replace({ pathname: '/main-chat', params: { intent, project } });
  } catch (e) {
    console.warn('debugOpen failed:', e);
  }
}
