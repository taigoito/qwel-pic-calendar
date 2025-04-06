<?php

function executeQuery($file, $sql, $options = []) {
  // DB接続
  $pdo = new PDO('sqlite:' . $file);

  // 設定
  // SQL実行時、エラーの代わりに例外を投げる
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  // fetchAll時、カラム名をキーとする連想配列で取得
  $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

  try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($options);

    $result = $stmt->fetchAll();

    return $result;

  } catch(PDOException $error) {
    // エラー処理
    echo $error->getMessage() . PHP_EOL;

  }
}

function fetchStatus($file) {
  $sql = "SELECT * FROM t_status";

  return executeQuery($file, $sql);
}

function insertState($file, $date, $state, $pic) {
  $sql = "INSERT INTO t_status(date, state, pic) VALUES (:date, :state, :pic)";
  $options = [
    ':date' => $date,
    ':state' => $state,
    ':pic' => $pic
  ];

  return executeQuery($file, $sql, $options);
}
