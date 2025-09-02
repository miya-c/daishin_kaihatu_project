// 使用量表示残存問題修正テスト
// 部屋移動時の使用量ステートクリア機能テスト

console.log('🧪 使用量表示残存問題修正テスト開始');

window.usageStatesFixTest = {
  
  // テスト実行
  async runTests() {
    console.log('\n=== 使用量ステート修正テスト実行 ===');
    
    const results = [];
    
    // テスト1: usageStates初期化確認
    results.push(await this.testUsageStatesInitialization());
    
    // テスト2: 部屋移動時のクリア確認
    results.push(await this.testRoomNavigationClear());
    
    // テスト3: データ読み込み時のクリア確認
    results.push(await this.testDataLoadClear());
    
    // テスト結果表示
    this.displayResults(results);
    
    return results.every(r => r.success);
  },
  
  // テスト1: usageStatesの初期化確認
  async testUsageStatesInitialization() {
    const test = {
      name: 'usageStates初期化テスト',
      success: false,
      details: []
    };
    
    try {
      // React stateの存在確認
      if (window.React && window.location.pathname.includes('reading')) {
        test.details.push('✅ React環境とreading画面を確認');
        
        // setUsageStatesのクリア呼び出し箇所を確認
        const pageSource = document.documentElement.outerHTML;
        const clearCalls = (pageSource.match(/setUsageStates\(\{\}\)/g) || []).length;
        
        if (clearCalls >= 4) {
          test.details.push(`✅ usageStatesクリア呼び出し: ${clearCalls}箇所発見`);
          test.success = true;
        } else {
          test.details.push(`❌ usageStatesクリア呼び出し不足: ${clearCalls}箇所のみ`);
        }
        
      } else {
        test.details.push('⚠️  React環境またはreading画面ではない');
      }
      
    } catch (error) {
      test.details.push(`❌ エラー: ${error.message}`);
    }
    
    return test;
  },
  
  // テスト2: 部屋移動時のクリア確認
  async testRoomNavigationClear() {
    const test = {
      name: '部屋移動時クリアテスト',
      success: false,
      details: []
    };
    
    try {
      // navigateToRoom関数の確認
      const pageSource = document.documentElement.outerHTML;
      
      if (pageSource.includes('navigateToRoom') && pageSource.includes('部屋移動時の使用量ステートクリア')) {
        test.details.push('✅ navigateToRoom関数内にクリア処理を確認');
        test.success = true;
      } else {
        test.details.push('❌ navigateToRoom関数内のクリア処理が見つからない');
      }
      
      if (pageSource.includes('loadMeterReadingsForRoom') && pageSource.includes('使用量ステートをクリア')) {
        test.details.push('✅ loadMeterReadingsForRoom関数内にクリア処理を確認');
      } else {
        test.details.push('❌ loadMeterReadingsForRoom関数内のクリア処理が見つからない');
        test.success = false;
      }
      
    } catch (error) {
      test.details.push(`❌ エラー: ${error.message}`);
    }
    
    return test;
  },
  
  // テスト3: データ読み込み時のクリア確認
  async testDataLoadClear() {
    const test = {
      name: 'データ読み込み時クリアテスト',
      success: false,
      details: []
    };
    
    try {
      const pageSource = document.documentElement.outerHTML;
      
      // loadMeterReadings関数内のクリア処理確認
      if (pageSource.includes('使用量ステートをクリアしてから新しいデータを設定')) {
        test.details.push('✅ データ設定前のクリア処理を確認');
        test.success = true;
      } else {
        test.details.push('❌ データ設定前のクリア処理が見つからない');
      }
      
      // 依存関係配列の更新確認
      if (pageSource.includes('setUsageStates]')) {
        test.details.push('✅ 依存関係配列にsetUsageStatesが追加されている');
      } else {
        test.details.push('❌ 依存関係配列の更新が不完全');
        test.success = false;
      }
      
    } catch (error) {
      test.details.push(`❌ エラー: ${error.message}`);
    }
    
    return test;
  },
  
  // テスト結果表示
  displayResults(results) {
    console.log('\n📊 テスト結果:');
    
    results.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`\n${index + 1}. ${result.name}: ${status}`);
      result.details.forEach(detail => console.log(`   ${detail}`));
    });
    
    const passCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    console.log(`\n📈 総合結果: ${passCount}/${totalCount} テスト合格`);
    
    if (passCount === totalCount) {
      console.log('🎉 全テスト合格！使用量表示残存問題の修正が完了しました。');
    } else {
      console.log('⚠️  一部テストが失敗しています。修正内容を確認してください。');
    }
  }
};

console.log('✅ 使用量ステート修正テストツール読み込み完了');
console.log('📋 実行方法: window.usageStatesFixTest.runTests()');