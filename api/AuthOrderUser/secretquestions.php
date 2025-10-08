<?php
include_once '../dbconn.php';

$conn = getConnection();

try {
  $stmt = $conn->query("SELECT * FROM secretquestion");
  $questions = $stmt->fetchAll(PDO::FETCH_ASSOC);

  http_response_code(200);
  echo json_encode($questions);
} catch (PDOException $e) {
  http_response_code(503);
  echo json_encode(["message" => "Unable to fetch security questions"]);
}
?>
