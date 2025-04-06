<?php
include_once('./functions.php');

$file = '../status.sqlite';
$method = $_GET['method'];

// ステータスの問い合わせ
if ($method === 'fetch') {
  // APIのアクセス許可
  header("Access-Control-Allow-Origin: *");

  // 実行
  $result = fetchStatus($file);
  
  // JSON出力
  echo json_encode($result, JSON_UNESCAPED_UNICODE);
  return;

} else {
  // リファラ確認
  $referer = $_SERVER['HTTP_REFERER'];
  $url = parse_url($referer);
  if (!stristr($url['host'], 'discoverechizen.com')) return;

  // ステータスの挿入
  if ($method === 'insert') {
    if (isset($_POST['date']) && isset($_POST['state']) && isset($_POST['pic'])) {
      insertState($file, $_POST['date'], $_POST['state'], $_POST['pic']); 
    }
  
    return;
  }
}
