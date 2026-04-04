/**
 * system_setup_wizard.gs - システム導入ウィザード機能 [DEPRECATED]
 * 
 * 注意: このファイルは非推奨です。
 * 全ての関数は水道検針アプリ.gsに統合されました。
 * 
 * Google Apps Scriptのファイル読み込み順序の問題により、
 * メニューからの関数呼び出しが失敗していたため、
 * 全ての関数を単一ファイルに統合しました。
 * 
 * 統合先: 水道検針アプリ.gs (行1599-2495)
 * 統合日: 2025-09-14
 */

/*
 * 以下の全ての関数は水道検針アプリ.gsに統合されました。
 * このファイルの内容は非推奨です。
 * 
 * 統合理由: Google Apps Scriptのファイル読み込み順序による
 * 「スクリプト関数が見つかりません」エラーの解決
 */

/**
 * システム導入ウィザードを開始（単体関数版）[DEPRECATED]
 * メニューから直接呼び出し可能な形式
 * 
 * 統合先: 水道検針アプリ.gs の startSystemSetupWizardFromMenu()
 */
function startSystemSetupWizard() {
  try {
    console.log('=== 検針システム導入ウィザード開始 ===');
    
    // ウィザード設定
    const wizardData = {
      currentStep: 1,
      totalSteps: 7,
      setupData: {
        startTime: new Date(),
        completedSteps: [],
        errors: [],
        warnings: [],
        results: {}
      },
      steps: defineSetupSteps()
    };
    
    const ui = SpreadsheetApp.getUi();
    
    // ウェルカムメッセージ表示
    if (!showWelcomeMessage(ui, wizardData.steps)) {
      return {
        success: false,
        message: 'ユーザーによりウィザードがキャンセルされました',
        cancelled: true
      };
    }
    
    // ウィザードフロー実行
    return executeWizardFlow(ui, wizardData);
    
  } catch (error) {
    console.error('導入ウィザード開始エラー:', error);
    return {
      success: false,
      error: error.message,
      message: `導入ウィザードの開始に失敗しました: ${error.message}`
    };
  }
}

/**
 * セットアップステップを定義
 */
function defineSetupSteps() {
  return {
    1: {
      name: 'システム診断・環境確認',
      description: 'スプレッドシートの状態を確認し、導入準備を行います',
      function: 'executeSystemDiagnosis',
      required: true,
      estimatedTime: '1-2分'
    },
    2: {
      name: 'マスタシートテンプレート作成',
      description: '物件マスタ・部屋マスタの基本構造を作成します',
      function: 'executeTemplateCreation',
      required: true,
      estimatedTime: '30秒'
    },
    3: {
      name: 'サンプルデータ投入',
      description: 'テスト用のサンプルデータを作成します（オプション）',
      function: 'executeSampleDataCreation',
      required: false,
      estimatedTime: '1分'
    },
    4: {
      name: '物件ID自動割り当て',
      description: '物件マスタにP000001形式のIDを割り当てます',
      function: 'executePropertyIdAssignment',
      required: true,
      estimatedTime: '30秒'
    },
    5: {
      name: '部屋ID自動生成',
      description: '物件ごとにR001形式の部屋IDを生成します',
      function: 'executeRoomIdGeneration',
      required: true,
      estimatedTime: '30秒'
    },
    6: {
      name: '検針データシート作成',
      description: '物件・部屋マスタから検針データシートを生成します',
      function: 'executeInspectionDataCreation',
      required: true,
      estimatedTime: '1分'
    },
    7: {
      name: '最終確認・動作テスト',
      description: 'システム全体の動作確認とセットアップ完了確認を行います',
      function: 'executeFinalValidation',
      required: true,
      estimatedTime: '1分'
    }
  };
}

/**
 * ウェルカムメッセージ表示
 */
function showWelcomeMessage(ui, steps) {
  let welcomeMessage = '🚀 検針システム導入ウィザードへようこそ！\n\n';
  welcomeMessage += '本ウィザードでは、以下の手順で検針システムをセットアップします：\n\n';
  
  Object.entries(steps).forEach(([stepNum, step]) => {
    const required = step.required ? '[必須]' : '[オプション]';
    welcomeMessage += `${stepNum}. ${step.name} ${required}\n`;
    welcomeMessage += `   ${step.description}\n`;
    welcomeMessage += `   予想時間: ${step.estimatedTime}\n\n`;
  });
  
  welcomeMessage += '⏱️ 総予想時間: 5-8分\n\n';
  welcomeMessage += '🔧 準備事項:\n';
  welcomeMessage += '• スプレッドシートの編集権限があることを確認\n';
  welcomeMessage += '• 物件・部屋データがある場合は事前に整理\n';
  welcomeMessage += '• 途中でキャンセルしても問題ありません\n\n';
  welcomeMessage += '導入ウィザードを開始しますか？';

  const response = ui.alert(
    '検針システム導入ウィザード',
    welcomeMessage,
    ui.ButtonSet.YES_NO
  );

  return response === ui.Button.YES;
}

/**
 * ウィザードフロー実行
 */
function executeWizardFlow(ui, wizardData) {
  try {
    for (let stepNum = 1; stepNum <= wizardData.totalSteps; stepNum++) {
      const step = wizardData.steps[stepNum];
      console.log(`=== ステップ${stepNum}: ${step.name} ===`);
      
      // ステップ開始確認（ヘルプ機能付き）
      const confirmResult = confirmStepExecutionWithHelp(ui, stepNum, step);
      if (confirmResult === 'cancel') {
        if (step.required) {
          return {
            success: false,
            message: `必須ステップ${stepNum}がキャンセルされたため、セットアップを中止しました`,
            completedSteps: wizardData.setupData.completedSteps
          };
        } else {
          console.log(`オプションステップ${stepNum}をスキップしました`);
          continue;
        }
      }
      
      // ステップ実行
      const stepResult = executeStep(stepNum, step);
      
      if (!stepResult.success) {
        if (step.required) {
          const continueSetup = handleStepErrorWithTroubleshooting(ui, stepNum, step, stepResult);
          if (!continueSetup) {
            return {
              success: false,
              message: `ステップ${stepNum}でエラーが発生し、セットアップを中止しました`,
              error: stepResult.error,
              completedSteps: wizardData.setupData.completedSteps
            };
          }
        } else {
          wizardData.setupData.warnings.push({
            step: stepNum,
            message: stepResult.error || stepResult.message
          });
        }
      } else {
        wizardData.setupData.completedSteps.push(stepNum);
        wizardData.setupData.results[stepNum] = stepResult;
      }
      
      // 進捗表示
      showProgress(ui, stepNum, wizardData.totalSteps, wizardData.steps);
    }
    
    // セットアップ完了
    return completeSetup(ui, wizardData.setupData);
    
  } catch (error) {
    console.error('ウィザードフロー実行エラー:', error);
    return {
      success: false,
      error: error.message,
      message: `導入ウィザードの実行に失敗しました: ${error.message}`,
      completedSteps: wizardData.setupData.completedSteps
    };
  }
}

/**
 * ステップ実行確認（インタラクティブガイダンス統合版）
 */
function confirmStepExecutionWithHelp(ui, stepNum, step) {
  try {
    const required = step.required ? '[必須]' : '[オプション]';
    let message = `📋 ステップ${stepNum}/7: ${step.name} ${required}\n\n`;
    message += `📝 内容: ${step.description}\n`;
    message += `⏱️ 予想時間: ${step.estimatedTime}\n\n`;
    
    if (!step.required) {
      message += '⚠️ このステップはオプションです。スキップできます。\n\n';
    }
    
    message += '🔍 詳細ガイドが必要な場合は「キャンセル」を選択してください。\n\n';
    message += 'このステップを実行しますか？';

    const response = ui.alert(
      `ステップ${stepNum}: ${step.name}`,
      message,
      ui.ButtonSet.YES_NO_CANCEL
    );

    if (response === ui.Button.YES) {
      return 'yes';
    } else if (response === ui.Button.NO) {
      return 'cancel';
    } else if (response === ui.Button.CANCEL) {
      // ヘルプオプション表示
      const helpResult = showStepHelpOptions(ui, stepNum, step);
      if (helpResult) {
        // ヘルプ表示後、再度実行確認
        return confirmStepExecutionWithHelp(ui, stepNum, step);
      }
      return 'cancel';
    }
    
    return 'cancel';
  } catch (error) {
    console.error(`ステップ${stepNum}確認エラー:`, error);
    return 'yes'; // エラー時は実行する
  }
}

/**
 * ステップ実行前のヘルプオプション表示
 */
function showStepHelpOptions(ui, stepNum, step) {
  try {
    let message = `🔍 ステップ${stepNum}: ${step.name}\n\n`;
    message += `📝 ${step.description}\n`;
    message += `⏱️ 予想時間: ${step.estimatedTime}\n\n`;
    message += '🆘 ヘルプが必要な場合:\n';
    message += '• 「はい」: 詳細ガイドを表示\n';
    message += '• 「いいえ」: そのまま実行\n';
    message += '• 「キャンセル」: ステップをスキップ\n\n';
    message += 'このステップの詳細ガイドを表示しますか？';

    const response = ui.alert(
      `ヘルプオプション - ステップ${stepNum}`,
      message,
      ui.ButtonSet.YES_NO_CANCEL
    );

    switch(response) {
      case ui.Button.YES:
        showInteractiveGuidance(ui, stepNum, step);
        return true;
      case ui.Button.NO:
        return true;
      case ui.Button.CANCEL:
        return false;
      default:
        return true;
    }
  } catch (error) {
    console.error(`ヘルプオプション表示エラー (ステップ${stepNum}):`, error);
    return true;
  }
}

/**
 * インタラクティブガイダンス表示
 */
function showInteractiveGuidance(ui, stepNum, step) {
  try {
    let guidance = `📖 ステップ${stepNum}: ${step.name} - 詳細ガイド\n\n`;
    
    // ステップ別の詳細ガイダンス
    switch(stepNum) {
      case 1:
        guidance += '🔍 システム診断・環境確認\n\n';
        guidance += 'このステップでは以下を確認します：\n';
        guidance += '• スプレッドシートの基本構造\n';
        guidance += '• 既存データの有無と整合性\n';
        guidance += '• 必要な権限の確認\n';
        guidance += '• データ形式の検証\n\n';
        guidance += '⚠️ 注意事項：\n';
        guidance += '• 既存データがある場合は事前にバックアップを推奨\n';
        guidance += '• エラーが多数ある場合は手動修正が必要な場合があります\n';
        break;
        
      case 2:
        guidance += '📋 マスタシートテンプレート作成\n\n';
        guidance += '作成されるシート：\n';
        guidance += '• 物件マスタ: 管理物件の基本情報\n';
        guidance += '• 部屋マスタ: 各物件の部屋情報\n';
        guidance += '• 設定値: システム設定とパラメータ\n\n';
        guidance += '📝 各シートには以下が含まれます：\n';
        guidance += '• 適切なヘッダー行\n';
        guidance += '• データ検証ルール\n';
        guidance += '• 条件付き書式設定\n';
        guidance += '• サンプル行（参考用）\n';
        break;
        
      case 3:
        guidance += '🗃️ サンプルデータ投入（オプション）\n\n';
        guidance += '投入されるサンプルデータ：\n';
        guidance += '• サンプル物件: 3件の物件情報\n';
        guidance += '• サンプル部屋: 各物件に2-3部屋\n';
        guidance += '• 基本設定値\n\n';
        guidance += '💡 このステップをスキップした場合：\n';
        guidance += '• 空のマスタシートで開始\n';
        guidance += '• 手動でデータを入力する必要があります\n';
        guidance += '• 後でサンプルデータを追加することも可能\n';
        break;
        
      case 4:
        guidance += '🏷️ 物件ID自動割り当て\n\n';
        guidance += 'ID割り当てルール：\n';
        guidance += '• 形式: P000001, P000002, P000003...\n';
        guidance += '• 既存IDは保持されます\n';
        guidance += '• 空白または無効なIDのみ新規割り当て\n';
        guidance += '• 連番は自動的に調整されます\n\n';
        guidance += '🔧 処理内容：\n';
        guidance += '• 物件マスタの全行をスキャン\n';
        guidance += '• 既存の有効なIDを識別\n';
        guidance += '• 未設定行に連番でID割り当て\n';
        break;
        
      case 5:
        guidance += '🚪 部屋ID自動生成\n\n';
        guidance += 'ID生成ルール：\n';
        guidance += '• 形式: R001, R002, R003...\n';
        guidance += '• 物件ごとに独立した連番\n';
        guidance += '• 既存IDとの重複を回避\n';
        guidance += '• 物件IDとの関連付けを維持\n\n';
        guidance += '📊 生成プロセス：\n';
        guidance += '1. 物件マスタから物件ID一覧を取得\n';
        guidance += '2. 各物件の部屋データを確認\n';
        guidance += '3. 物件ごとに部屋IDを連番で生成\n';
        guidance += '4. 部屋マスタに反映\n';
        break;
        
      case 6:
        guidance += '📊 検針データシート作成\n\n';
        guidance += 'シート構造：\n';
        guidance += '• 物件・部屋情報のマージ\n';
        guidance += '• 検針用の入力列（前回・今回指示数など）\n';
        guidance += '• 計算列（使用量・料金など）\n';
        guidance += '• ステータス管理列\n\n';
        guidance += '🔄 データ同期：\n';
        guidance += '• マスタシートの最新情報を反映\n';
        guidance += '• 既存の検針データは保持\n';
        guidance += '• 新しい物件・部屋は自動追加\n';
        break;
        
      case 7:
        guidance += '✅ 最終確認・動作テスト\n\n';
        guidance += '検証項目：\n';
        guidance += '• 全シートの構造確認\n';
        guidance += '• データ整合性チェック\n';
        guidance += '• 必要な関数の動作確認\n';
        guidance += '• ID割り当ての正確性\n\n';
        guidance += '📋 レポート生成：\n';
        guidance += '• セットアップ状況の詳細レポート\n';
        guidance += '• 発見された問題とその対処法\n';
        guidance += '• 次のステップの推奨事項\n';
        break;
        
      default:
        guidance += 'このステップの詳細情報はありません。';
    }
    
    guidance += '\n\n❓ より詳しい情報が必要な場合は「使用方法ガイド」メニューをご確認ください。';
    
    ui.alert(
      `詳細ガイド - ステップ${stepNum}`,
      guidance,
      ui.ButtonSet.OK
    );
    
    return true;
  } catch (error) {
    console.error(`ガイダンス表示エラー (ステップ${stepNum}):`, error);
    return false;
  }
}

/**
 * ステップを実行
 */
function executeStep(stepNum, step) {
  try {
    const functionName = step.function;
    console.log(`ステップ${stepNum}実行開始: ${functionName}`);
    
    // 対応する実行関数を呼び出し
    switch(functionName) {
      case 'executeSystemDiagnosis':
        return executeSystemDiagnosis();
      case 'executeTemplateCreation':
        return executeTemplateCreation();
      case 'executeSampleDataCreation':
        return executeSampleDataCreation();
      case 'executePropertyIdAssignment':
        return executePropertyIdAssignment();
      case 'executeRoomIdGeneration':
        return executeRoomIdGeneration();
      case 'executeInspectionDataCreation':
        return executeInspectionDataCreation();
      case 'executeFinalValidation':
        return executeFinalValidation();
      default:
        throw new Error(`実行関数が見つかりません: ${functionName}`);
    }
  } catch (error) {
    console.error(`ステップ${stepNum}実行エラー:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * ステップ1: システム診断・環境確認
 */
function executeSystemDiagnosis() {
  try {
    console.log('システム診断実行中...');
    const diagnostics = runSystemDiagnostics();
    
    const hasErrors = diagnostics.issues && diagnostics.issues.some(issue => issue.type === 'error');
    const hasWarnings = diagnostics.issues && diagnostics.issues.some(issue => issue.type === 'warning');
    
    let message = '✅ システム診断が完了しました。\n\n';
    
    if (diagnostics.sheets) {
      const existingSheets = diagnostics.sheets.filter(sheet => sheet.exists);
      message += `📊 既存シート: ${existingSheets.length}個\n`;
      
      if (existingSheets.length > 0) {
        existingSheets.forEach(sheet => {
          message += `  • ${sheet.name}: ${sheet.rows}行 x ${sheet.columns}列\n`;
        });
      }
    }
    
    if (hasErrors) {
      message += '\n🚨 エラーが検出されました:\n';
      diagnostics.issues.filter(i => i.type === 'error').forEach(issue => {
        message += `  • ${issue.message}\n`;
      });
    }
    
    if (hasWarnings) {
      message += '\n⚠️ 警告が検出されました:\n';
      diagnostics.issues.filter(i => i.type === 'warning').forEach(issue => {
        message += `  • ${issue.message}\n`;
      });
    }
    
    return {
      success: true,
      message: message,
      data: diagnostics,
      hasErrors: hasErrors,
      hasWarnings: hasWarnings
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: `システム診断に失敗しました: ${error.message}`
    };
  }
}

/**
 * ステップ2: マスタシートテンプレート作成
 */
function executeTemplateCreation() {
  try {
    console.log('マスタシートテンプレート作成中...');
    const result = createMasterSheetTemplates();
    
    return {
      success: result.success,
      message: result.message || 'マスタシートテンプレートを作成しました',
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: `マスタシートテンプレート作成に失敗しました: ${error.message}`
    };
  }
}

/**
 * ステップ3: サンプルデータ投入
 */
function executeSampleDataCreation() {
  try {
    console.log('サンプルデータ投入中...');
    const result = createSampleData();
    
    return {
      success: result.success,
      message: result.message || 'サンプルデータを投入しました',
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: `サンプルデータ投入に失敗しました: ${error.message}`
    };
  }
}

/**
 * ステップ4: 物件ID自動割り当て
 */
function executePropertyIdAssignment() {
  try {
    console.log('物件ID自動割り当て中...');
    const result = formatAllPropertyIds();
    
    return {
      success: result.success,
      message: result.message || '物件IDを自動割り当てしました',
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: `物件ID自動割り当てに失敗しました: ${error.message}`
    };
  }
}

/**
 * ステップ5: 部屋ID自動生成
 */
function executeRoomIdGeneration() {
  try {
    console.log('部屋ID自動生成中...');
    const result = generateRoomIds();
    
    return {
      success: result.success,
      message: result.message || '部屋IDを自動生成しました',
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: `部屋ID自動生成に失敗しました: ${error.message}`
    };
  }
}

/**
 * ステップ6: 検針データシート作成
 */
function executeInspectionDataCreation() {
  try {
    console.log('検針データシート作成中...');
    const result = createInitialInspectionData();
    
    return {
      success: result.success,
      message: result.message || '検針データシートを作成しました',
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: `検針データシート作成に失敗しました: ${error.message}`
    };
  }
}

/**
 * ステップ7: 最終確認・動作テスト
 */
function executeFinalValidation() {
  try {
    console.log('最終確認・動作テスト中...');
    const result = validateSystemSetup();
    
    return {
      success: result.success,
      message: result.message || 'システムセットアップが完了しました',
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: `最終確認に失敗しました: ${error.message}`
    };
  }
}

/**
 * ステップエラーハンドリング（トラブルシューティング統合版）
 */
function handleStepErrorWithTroubleshooting(ui, stepNum, step, stepResult) {
  try {
    let message = `❌ ステップ${stepNum}でエラーが発生しました\n\n`;
    message += `ステップ名: ${step.name}\n`;
    message += `エラー内容: ${stepResult.error || stepResult.message}\n\n`;
    message += '対処方法:\n';
    message += '• 「はい」: 再試行する\n';
    message += '• 「いいえ」: セットアップを中止する\n';
    message += '• 「キャンセル」: トラブルシューティングガイドを表示\n\n';
    message += 'どうしますか？';

    const response = ui.alert(
      'エラーが発生しました',
      message,
      ui.ButtonSet.YES_NO_CANCEL
    );

    if (response === ui.Button.YES) {
      // 再試行
      const retryResult = executeStep(stepNum, step);
      return retryResult.success;
    } else if (response === ui.Button.NO) {
      // セットアップ中止
      return false;
    } else if (response === ui.Button.CANCEL) {
      // トラブルシューティングガイド表示
      showTroubleshootingGuide(ui, stepNum, step, stepResult.error || stepResult.message);
      
      // ガイド表示後の選択肢
      const afterGuideResponse = ui.alert(
        'トラブルシューティング完了',
        'ガイドを確認しました。\n\n「はい」: 再試行\n「いいえ」: セットアップ中止\n「キャンセル」: エラーを無視して続行',
        ui.ButtonSet.YES_NO_CANCEL
      );
      
      if (afterGuideResponse === ui.Button.YES) {
        const retryResult = executeStep(stepNum, step);
        return retryResult.success;
      } else if (afterGuideResponse === ui.Button.NO) {
        return false;
      } else {
        // エラーを無視して続行
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('エラーハンドリングエラー:', error);
    return false;
  }
}

/**
 * トラブルシューティングガイド表示
 */
function showTroubleshootingGuide(ui, stepNum, step, error) {
  try {
    let guide = `🔧 トラブルシューティング - ステップ${stepNum}\n\n`;
    guide += `⚠️ 発生したエラー: ${error}\n\n`;
    
    // ステップ別のトラブルシューティング
    switch(stepNum) {
      case 1:
        guide += '🔍 システム診断エラーの対処法:\n\n';
        guide += '1. **権限エラーの場合**:\n';
        guide += '   • スプレッドシートの編集権限があることを確認\n';
        guide += '   • ブラウザを更新してから再実行\n\n';
        guide += '2. **既存データエラーの場合**:\n';
        guide += '   • 既存のシート名に問題がある可能性\n';
        guide += '   • 重複するシート名を削除または名前変更\n\n';
        guide += '3. **その他のエラー**:\n';
        guide += '   • 一時的な問題の可能性があります\n';
        guide += '   • 数分待ってから再実行してください\n';
        break;
        
      case 2:
        guide += '📋 マスタシート作成エラーの対処法:\n\n';
        guide += '1. **シート作成権限エラー**:\n';
        guide += '   • スプレッドシートの編集権限を確認\n';
        guide += '   • 他のユーザーが編集中でないか確認\n\n';
        guide += '2. **既存シート名の競合**:\n';
        guide += '   • 同名のシートが既に存在する場合があります\n';
        guide += '   • 既存シートの名前を変更するか削除\n\n';
        guide += '3. **データ形式エラー**:\n';
        guide += '   • テンプレートデータの形式を確認\n';
        guide += '   • 手動でシートを作成してから再実行\n';
        break;
        
      case 3:
        guide += '🗃️ サンプルデータエラーの対処法:\n\n';
        guide += '1. **データ投入エラー**:\n';
        guide += '   • マスタシートが正しく作成されているか確認\n';
        guide += '   • ヘッダー行が適切に設定されているか確認\n\n';
        guide += '2. **このステップはオプション**:\n';
        guide += '   • エラーが続く場合はスキップ可能\n';
        guide += '   • 後で手動でデータを入力できます\n';
        break;
        
      case 4:
        guide += '🏷️ 物件ID割り当てエラーの対処法:\n\n';
        guide += '1. **物件マスタが見つからない**:\n';
        guide += '   • ステップ2が正常に完了していることを確認\n';
        guide += '   • 物件マスタシートの存在を確認\n\n';
        guide += '2. **データ形式エラー**:\n';
        guide += '   • 物件マスタのヘッダー行を確認\n';
        guide += '   • 必要な列（物件名、住所等）があることを確認\n\n';
        guide += '3. **ID重複エラー**:\n';
        guide += '   • 既存の物件IDに重複がないか確認\n';
        guide += '   • 手動で重複を解消してから再実行\n';
        break;
        
      case 5:
        guide += '🚪 部屋ID生成エラーの対処法:\n\n';
        guide += '1. **部屋マスタが見つからない**:\n';
        guide += '   • 部屋マスタシートの存在を確認\n';
        guide += '   • 物件IDとの関連付けを確認\n\n';
        guide += '2. **物件IDエラー**:\n';
        guide += '   • ステップ4が正常に完了していることを確認\n';
        guide += '   • 物件マスタの物件IDを確認\n\n';
        guide += '3. **データ不整合**:\n';
        guide += '   • 部屋マスタの物件ID列を確認\n';
        guide += '   • 存在しない物件IDが含まれていないか確認\n';
        break;
        
      case 6:
        guide += '📊 検針データ作成エラーの対処法:\n\n';
        guide += '1. **マスタデータエラー**:\n';
        guide += '   • 物件マスタと部屋マスタが正常に作成されているか確認\n';
        guide += '   • 必要なIDが全て割り当てられているか確認\n\n';
        guide += '2. **シート作成権限**:\n';
        guide += '   • inspection_dataシートの作成権限を確認\n';
        guide += '   • 既存のシートと名前が競合していないか確認\n\n';
        guide += '3. **データ量が多い場合**:\n';
        guide += '   • 処理に時間がかかる場合があります\n';
        guide += '   • しばらく待ってから結果を確認\n';
        break;
        
      case 7:
        guide += '✅ 最終確認エラーの対処法:\n\n';
        guide += '1. **検証エラー**:\n';
        guide += '   • 前のステップが全て正常に完了しているか確認\n';
        guide += '   • エラーログを詳細に確認\n\n';
        guide += '2. **データ不整合**:\n';
        guide += '   • 手動でデータを確認・修正\n';
        guide += '   • 必要に応じて該当ステップから再実行\n\n';
        guide += '3. **部分的な成功**:\n';
        guide += '   • 一部のチェックが失敗しても使用可能な場合があります\n';
        guide += '   • 詳細レポートで問題点を確認\n';
        break;
        
      default:
        guide += '一般的な対処法:\n';
        guide += '1. ブラウザを更新して再実行\n';
        guide += '2. スプレッドシートの権限を確認\n';
        guide += '3. 一時的な問題の可能性があるため数分後に再実行\n';
    }
    
    guide += '\n\n🆘 それでも解決しない場合:\n';
    guide += '• 「ℹ️ 使用方法ガイド」で詳細情報を確認\n';
    guide += '• システム管理者にお問い合わせください\n';
    guide += '• エラーメッセージを控えておいてください';
    
    ui.alert(
      'トラブルシューティング',
      guide,
      ui.ButtonSet.OK
    );
    
    return true;
  } catch (error) {
    console.error('トラブルシューティングガイド表示エラー:', error);
    return false;
  }
}

/**
 * 進捗表示
 */
function showProgress(ui, completedStep, totalSteps, steps) {
  try {
    const progress = Math.round((completedStep / totalSteps) * 100);
    const progressBar = '█'.repeat(Math.floor(progress / 10)) + '▒'.repeat(10 - Math.floor(progress / 10));
    
    console.log(`進捗: ${progressBar} ${progress}% (${completedStep}/${totalSteps})`);
    
    // 中間進捗をユーザーに表示（3ステップごと）
    if (completedStep % 3 === 0 || completedStep === totalSteps) {
      let message = `📊 導入進捗: ${progress}%\n\n`;
      message += `${progressBar}\n\n`;
      message += `完了: ${completedStep}/${totalSteps}ステップ\n`;
      
      if (completedStep < totalSteps) {
        message += `\n次のステップ: ${steps[completedStep + 1].name}`;
      }

      ui.alert('導入進捗', message, ui.ButtonSet.OK);
    }
  } catch (error) {
    console.error('進捗表示エラー:', error);
  }
}

/**
 * セットアップ完了処理
 */
function completeSetup(ui, setupData) {
  try {
    const endTime = new Date();
    const duration = Math.round((endTime - setupData.startTime) / 1000);
    
    let message = '🎉 検針システムの導入が完了しました！\n\n';
    message += `⏱️ 導入時間: ${Math.floor(duration / 60)}分${duration % 60}秒\n`;
    message += `✅ 完了ステップ: ${setupData.completedSteps.length}/7\n\n`;
    
    if (setupData.errors.length > 0) {
      message += `⚠️ エラー: ${setupData.errors.length}件\n`;
    }
    
    if (setupData.warnings.length > 0) {
      message += `🔶 警告: ${setupData.warnings.length}件\n`;
    }
    
    message += '\n🚀 次のステップ:\n';
    message += '1. メニューから「📋 物件一覧を表示」で物件データを確認\n';
    message += '2. 「📊 検針データ入力」で実際の検針を開始\n';
    message += '3. 「ℹ️ 使用方法ガイド」で詳細な使い方を確認\n\n';
    message += '導入レポートを生成しますか？';

    const response = ui.alert(
      '導入完了',
      message,
      ui.ButtonSet.YES_NO
    );

    const result = {
      success: true,
      message: '検針システムの導入が完了しました',
      duration: duration,
      completedSteps: setupData.completedSteps,
      errors: setupData.errors,
      warnings: setupData.warnings,
      setupData: setupData
    };

    if (response === ui.Button.YES) {
      result.report = generateSetupReport(setupData, duration);
    }

    return result;
    
  } catch (error) {
    console.error('セットアップ完了処理エラー:', error);
    return {
      success: false,
      error: error.message,
      message: `セットアップ完了処理に失敗しました: ${error.message}`
    };
  }
}

/**
 * セットアップレポート生成
 */
function generateSetupReport(setupData, duration) {
  try {
    const endTime = new Date();
    const steps = defineSetupSteps();
    
    let report = '# 検針システム導入レポート\n\n';
    report += `**導入日時**: ${setupData.startTime.toLocaleString('ja-JP')}\n`;
    report += `**完了日時**: ${endTime.toLocaleString('ja-JP')}\n`;
    report += `**所要時間**: ${Math.floor(duration / 60)}分${duration % 60}秒\n\n`;
    
    report += '## 📊 導入結果サマリー\n\n';
    report += `- **総ステップ数**: 7\n`;
    report += `- **完了ステップ**: ${setupData.completedSteps.length}\n`;
    report += `- **エラー**: ${setupData.errors.length}件\n`;
    report += `- **警告**: ${setupData.warnings.length}件\n\n`;
    
    report += '## 🔄 実行ステップ詳細\n\n';
    Object.entries(steps).forEach(([stepNum, step]) => {
      const completed = setupData.completedSteps.includes(parseInt(stepNum));
      const status = completed ? '✅ 完了' : '❌ 未完了';
      
      report += `### ステップ${stepNum}: ${step.name} ${status}\n`;
      report += `- **説明**: ${step.description}\n`;
      report += `- **必須**: ${step.required ? 'はい' : 'いいえ'}\n`;
      
      if (setupData.results[stepNum]) {
        const result = setupData.results[stepNum];
        report += `- **実行結果**: ${result.success ? '成功' : '失敗'}\n`;
        if (result.message) {
          report += `- **詳細**: ${result.message}\n`;
        }
      }
      report += '\n';
    });
    
    if (setupData.errors.length > 0) {
      report += '## ❌ エラー詳細\n\n';
      setupData.errors.forEach((error, index) => {
        report += `${index + 1}. **ステップ${error.step}**: ${error.message}\n`;
      });
      report += '\n';
    }
    
    if (setupData.warnings.length > 0) {
      report += '## ⚠️ 警告詳細\n\n';
      setupData.warnings.forEach((warning, index) => {
        report += `${index + 1}. **ステップ${warning.step}**: ${warning.message}\n`;
      });
      report += '\n';
    }
    
    report += '## 🚀 次のアクション\n\n';
    report += '導入が完了しました。以下の手順で検針システムをご利用ください：\n\n';
    report += '1. **データ確認**: メニューから「📋 物件一覧を表示」「🏠 部屋一覧を表示」\n';
    report += '2. **検針開始**: 「📊 検針データ入力」で実際の検針作業\n';
    report += '3. **月次処理**: 月末に「📅 月次処理実行」でデータアーカイブ\n';
    report += '4. **ヘルプ**: 「ℹ️ 使用方法ガイド」で詳細な操作方法を確認\n\n';
    report += '---\n';
    report += '*このレポートは検針システム導入ウィザードにより自動生成されました。*';
    
    console.log(report);
    return report;
    
  } catch (error) {
    console.error('セットアップレポート生成エラー:', error);
    return `レポート生成エラー: ${error.message}`;
  }
}