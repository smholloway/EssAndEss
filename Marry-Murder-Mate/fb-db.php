<?php
$con = mysql_connect("localhost", "root", "mysql4ALL!");
if (!$con) {
  die('Could not connect to DB: ' . mysql_error());
}
mysql_select_db("mmm", $con);
?>
