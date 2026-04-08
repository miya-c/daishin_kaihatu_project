<script lang="ts">
  import { getGasUrl, fetchProperties } from '../../utils/gasClient';
  import { CACHE_TTL_MS } from '../../utils/config';
  import NetworkStatusBar from '../NetworkStatusBar.svelte';
  import type { Property } from '../../types';

  let properties: Property[] = $state([]);
  let searchTerm: string = $state('');
  let loading: boolean = $state(true);
  let error: string | null = $state(null);
  let isFetched: boolean = $state(false);

  let showUrlModal: boolean = $state(false);
  let showExitModal: boolean = $state(false);
  let urlInput: string = $state(
    import.meta.env.VITE_GAS_WEB_APP_URL || 'https://script.google.com/macros/s/'
  );

  const formatCompletionDate = (dateStr: string): string => {
    if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `検針完了日：${month}月${day}日`;
    } catch (_error) {
      return '';
    }
  };

  $effect(() => {
    window.scrollTo(0, 0);

    const fetchPropertiesData = async () => {
      loading = true;
      error = null;
      isFetched = false;

      const currentUrl = getGasUrl();
      if (!currentUrl || !currentUrl.includes('script.google.com')) {
        showUrlModal = true;
        loading = false;
        return;
      }

      const cached = localStorage.getItem('cached_properties');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const entries = Array.isArray(parsed) ? parsed : parsed.data;
          const cachedAt = parsed.cachedAt ?? 0;
          if (Array.isArray(entries) && Date.now() - cachedAt < CACHE_TTL_MS) {
            properties = entries as Property[];
            loading = false;
            isFetched = true;
          }
        } catch {}
      }

      try {
        const data = (await fetchProperties(currentUrl)) as Record<string, unknown>;
        const actualData = data.data || data.properties || (Array.isArray(data) ? data : null);
        if (!actualData || !Array.isArray(actualData)) {
          throw new Error('物件データの形式が正しくありません。');
        }
        const normalizedData: Property[] = (actualData as Record<string, unknown>[]).map(
          (property) => ({
            id: String(property.id || property['物件ID'] || ''),
            name: String(property.name || property['物件名'] || '名称未設定'),
            completionDate: String(property.completionDate || property['検針完了日'] || ''),
          })
        );
        properties = normalizedData;
        localStorage.setItem(
          'cached_properties',
          JSON.stringify({ data: normalizedData, cachedAt: Date.now() })
        );
      } catch (fetchError) {
        if (properties.length > 0) return;
        const fetchErr = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
        let errorMessage = '物件情報の取得に失敗しました。\n\n';
        if (fetchErr.message.includes('Failed to fetch')) {
          errorMessage +=
            '原因: ネットワークエラーまたはCORS問題\n対処法: インターネット接続を確認してください';
        } else {
          errorMessage += `原因: ${fetchErr.message}`;
        }
        error = errorMessage;
        loading = false;
      } finally {
        isFetched = true;
      }
    };

    fetchPropertiesData();
  });

  $effect(() => {
    if (isFetched && loading) {
      loading = false;
    }
  });

  const handleUrlSubmit = () => {
    if (urlInput && urlInput.includes('script.google.com')) {
      localStorage.setItem('gasWebAppUrl', urlInput);
      sessionStorage.setItem('gasWebAppUrl', urlInput);
      window.location.reload();
    } else {
      error = '正しいGAS Web App URLを設定してください。';
      showUrlModal = false;
    }
  };

  function handleExitYes(): void {
    window.close();
    document.body.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#333;font-size:1.125rem;">アプリを終了してください。</div>';
  }

  function handleExitNo(): void {
    showExitModal = false;
  }

  const handlePropertySelect = (property: Property) => {
    if (!property || typeof property.id === 'undefined' || typeof property.name === 'undefined')
      return;

    // Save property info to sessionStorage for the room page
    sessionStorage.setItem('selectedPropertyId', String(property.id));
    sessionStorage.setItem('selectedPropertyName', String(property.name));

    // Navigate immediately — room page handles fetching room data from API
    window.location.href = `/room/?propertyId=${encodeURIComponent(property.id)}`;
  };

  let filteredProperties: Property[] = $derived(
    (properties || []).filter((property) => {
      const idStr = String(property.id != null ? property.id : '');
      const nameStr = String(property.name != null ? property.name : '');
      return (
        idStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nameStr.toLowerCase().includes(searchTerm.toLowerCase())
      );
    })
  );
</script>

{#if loading && !isFetched}
  <!-- Loading state -->
  <div>
    <div class="MuiAppBar-root">
      <div class="MuiToolbar-root">
        <div class="app-title">物件選択</div>
      </div>
    </div>
    <div class="MuiContainer-root">
      <div style="max-width: 600px; margin: 0 auto;">
        <div class="MuiTextField-root">
          <input
            type="text"
            placeholder="物件IDまたは物件名で検索..."
            value=""
            disabled
            style="opacity: 0.6; cursor: not-allowed;"
          />
        </div>
        <div class="loading-container">
          <div class="MuiCircularProgress-root"></div>
          <div
            class="MuiTypography-root"
            style="font-size: 1.1rem; color: var(--mui-palette-grey-900); font-weight: 500; text-align: center; margin: 16px 0 0 0;"
          >
            物件情報を読み込み中です...
          </div>
        </div>
      </div>
    </div>
  </div>
{:else if error && isFetched}
  <!-- Error state -->
  <div>
    <div class="MuiAppBar-root">
      <div class="MuiToolbar-root">
        <div class="app-title">物件選択</div>
      </div>
    </div>
    <div class="MuiContainer-root">
      <div style="max-width: 600px; margin: 0 auto;">
        <div class="MuiTextField-root">
          <input
            type="text"
            placeholder="物件IDまたは物件名で検索..."
            bind:value={searchTerm}
            disabled
            style="opacity: 0.6;"
          />
        </div>
        <div class="MuiAlert-root">
          <div
            class="MuiTypography-root"
            style="font-size: 1.125rem; font-weight: 600; margin: 0 0 8px 0; color: #b91c1c;"
          >
            エラー
          </div>
          <div class="MuiTypography-root" style="font-size: 1rem; margin: 0; color: #b91c1c;">
            {String(error || 'エラーが発生しました')}
          </div>
        </div>
      </div>
    </div>
  </div>
{:else}
  <!-- Main content -->
  <div style="min-height: 100vh;">
    <NetworkStatusBar />
    <a href="#main-content" class="skip-link">メインコンテンツへ</a>

    {#if showUrlModal}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="url-modal-title"
        style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2147483647;"
      >
        <div
          style="background-color: #fff; border-radius: 16px; padding: 32px; max-width: 480px; width: 90%; box-shadow: 0 8px 32px rgba(0,0,0,0.2);"
        >
          <h3
            id="url-modal-title"
            style="margin: 0 0 16px 0; font-size: 1.125rem; font-weight: 600;"
          >
            GAS Web App URL設定
          </h3>
          <p style="margin: 0 0 16px 0; font-size: 0.875rem; color: var(--mui-palette-grey-900);">
            GAS Web App URLが設定されていません。Google Apps ScriptのWeb App URLを入力してください。
          </p>
          <input
            type="text"
            bind:value={urlInput}
            style="width: 100%; padding: 10px; font-size: 0.875rem; border: 1px solid #ccc; border-radius: 8px; box-sizing: border-box; margin-bottom: 16px;"
            placeholder="https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"
          />
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button
              onclick={() => {
                showUrlModal = false;
                error = '正しいGAS Web App URLを設定してください。';
              }}
              style="padding: 12px 24px; border-radius: 8px; border: 1px solid #ccc; background-color: #fff; cursor: pointer; min-height: 44px;"
            >
              キャンセル
            </button>
            <button
              onclick={handleUrlSubmit}
              style="padding: 12px 24px; border-radius: 8px; border: none; background-color: var(--mui-palette-primary-main, #1976d2); color: #fff; cursor: pointer; font-weight: 600; min-height: 44px;"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    {/if}

    <div class="MuiAppBar-root">
      <div class="MuiToolbar-root" style="position: relative;">
        <div class="app-title" style="position: absolute; left: 50%; transform: translateX(-50%);">
          物件選択
        </div>
        <button
          onclick={() => (showExitModal = true)}
          style="margin-left: auto; background: none; border: none; color: #fff; cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 0.875rem;"
          aria-label="アプリ終了"
        >
          <span class="material-icons MuiSvgIcon-root" style="font-size: 20px;">close</span>
          終了
        </button>
      </div>
    </div>

    <div id="main-content" class="MuiContainer-root">
      <div style="max-width: 600px; margin: 0 auto;">
        <div
          class="MuiTextField-root"
          style="position: sticky; top: 64px; z-index: 1050; background-color: transparent; padding: 12px 0;"
        >
          <input
            type="text"
            placeholder="物件IDまたは物件名で検索..."
            bind:value={searchTerm}
            disabled={loading && properties.length === 0}
          />
        </div>

        {#if loading && isFetched}
          <div
            style="display: flex; align-items: center; justify-content: center; margin-bottom: 16px; gap: 12px;"
          >
            <div class="MuiCircularProgress-root" style="width: 24px; height: 24px;"></div>
            <div style="font-size: 0.875rem; color: var(--mui-palette-grey-900);">処理中...</div>
          </div>
        {/if}

        {#if error}
          <div class="MuiAlert-root" style="margin-bottom: 16px;">
            <div style="font-size: 1.125rem; font-weight: 600; margin: 0 0 8px 0; color: #b91c1c;">
              {navigator.onLine ? 'エラー' : 'オフラインです'}
            </div>
            <div style="font-size: 1rem; margin: 0; color: #b91c1c;">
              {navigator.onLine
                ? String(error)
                : 'インターネットに接続されていません。オンライン状態で一度アプリを開いてから再度お試しください。'}
            </div>
          </div>
        {/if}

        {#if !loading && isFetched && properties.length === 0 && !error}
          <div style="text-align: center; color: var(--mui-palette-grey-900); font-size: 1rem;">
            登録されている物件がありません。
          </div>
        {/if}

        {#if !loading && isFetched && properties.length > 0 && filteredProperties.length === 0}
          <div style="text-align: center; color: var(--mui-palette-grey-900); font-size: 1rem;">
            該当する物件が見つかりません。
          </div>
        {/if}

        <div style="display: flex; flex-direction: column; gap: 16px;">
          {#each filteredProperties as property, index (property.id)}
            {@const completionText = formatCompletionDate(String(property.completionDate))}
            {@const isDisabled = loading}
            <div
              data-property-id={String(property.id)}
              class="MuiCard-root {isDisabled ? 'MuiCard-disabled' : ''}"
              tabindex={isDisabled ? -1 : 0}
              role="button"
              aria-label="{String(property.name || '名称なし')}を選択"
              onclick={() => !isDisabled && handlePropertySelect(property)}
              onkeydown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
                  e.preventDefault();
                  handlePropertySelect(property);
                }
              }}
              style="opacity: {isDisabled ? 0.6 : 1}; cursor: {isDisabled
                ? 'not-allowed'
                : 'pointer'}; animation-delay: {index * 0.1}s;"
            >
              <div class="MuiCardContent-root">
                <div
                  style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;"
                >
                  <div style="flex: 1;">
                    <div
                      style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap;"
                    >
                      <div
                        style="background-color: var(--mui-palette-grey-100); color: var(--mui-palette-grey-900); font-size: 0.875rem; font-weight: 600; padding: 8px 12px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.08); box-shadow: 0 1px 3px rgba(0,0,0,0.05);"
                      >
                        ID: {String(property.id || 'IDなし')}
                      </div>
                      {#if completionText}
                        <div
                          style="background-color: #e8f5e8; color: #2e7d32; font-size: 0.75rem; font-weight: 600; padding: 6px 10px; border-radius: 12px; border: 1px solid #c8e6c9; box-shadow: 0 2px 8px rgba(46,125,50,0.15);"
                        >
                          {completionText}
                        </div>
                      {/if}
                    </div>
                    <div
                      style="font-size: 1.125rem; font-weight: 500; color: var(--mui-palette-grey-900); line-height: 1.4; margin: 0;"
                    >
                      {String(property.name || '名称なし')}
                    </div>
                  </div>
                  <div
                    style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; color: var(--mui-palette-primary-main); flex-shrink: 0;"
                  >
                    <svg
                      width="24"
                      height="24"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>

    {#if showExitModal}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-modal-title"
        style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2147483647;"
      >
        <div
          style="background-color: var(--mui-palette-primary-main, #1976d2); border-radius: 16px; padding: 32px; max-width: 360px; width: 90%; box-shadow: 0 8px 32px rgba(0,0,0,0.2); text-align: center;"
        >
          <h3
            id="exit-modal-title"
            style="margin: 0 0 8px 0; font-size: 1.25rem; font-weight: 600; color: #fff; white-space: nowrap;"
          >
            アプリを終了しますか？
          </h3>
          <div style="display: flex; gap: 12px; justify-content: center; margin-top: 20px;">
            <button
              onclick={handleExitYes}
              style="flex: 1; padding: 10px 16px; border-radius: 8px; border: 2px solid #fff; background-color: #fff; color: var(--mui-palette-primary-main, #1976d2); cursor: pointer; font-weight: 600; font-size: 1.125rem;"
            >
              はい
            </button>
            <button
              onclick={handleExitNo}
              style="flex: 1; padding: 10px 16px; border-radius: 8px; border: 2px solid rgba(255,255,255,0.5); background-color: transparent; color: #fff; cursor: pointer; font-size: 1.125rem;"
            >
              いいえ
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}
