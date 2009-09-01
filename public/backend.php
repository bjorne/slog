<?php

error_reporting(E_ALL);

require("../conf.php");

if (!isset($_POST['query']))
	$_POST['query'] = null;
if (!isset($_POST['offset']))
	$_POST['offset'] = null;

$lc = new LogController();
$lc->dispatch();

class LogController
{
	function LogController()
	{
		$this->table = "log";
		$this->queries = array();
	}
	
	function dispatch()
	{
		$start = microtime(true);
		
		$this->link = mysql_pconnect($GLOBALS["db_host"], $GLOBALS["db_user"], $GLOBALS["db_pass"]);
		if (!$this->link)
		{
			die("Unable to connect to MySQL");
		}
		
		$this->db = mysql_select_db($GLOBALS["db_db"], $this->link);
		if (!$this->db)
		{
			die("Unable to select DB.");
		}
		
		if (isset($_POST['count']))
		{
			$data = $this->getEntries($_POST['query'], true);
		}
		else
		{
			$data = $this->getEntries($_POST['query'], false, $_POST['offset']);
		}
		$data['time'] = microtime(true) - $start;
		$data['query'] = implode("<br />", $this->queries);
		$this->renderJSON($data);
	}
	
	function renderJSON($soup)
	{
		header("Content-type: text/javascript");
		echo json_encode($soup);
	}
	
	function getEntries($query, $count = false, $offset = 0) 
	{
		$offset = (int)$offset;
		if ($offset < 0)
			$offset = 0;


		$dataConditions = array();
		$nickCondition = "";
		$dateCondition = "";
		$orderCondition = "";

		$parts = split(" ", $query);
		if ($parts == false) {
			$dataConditions[] = $query;
		} else {
			foreach ($parts as $part) {
				$subparts = split(":", $part);
				if ($subparts == false) {
					$dataConditions[] = $part;
				} else {
					switch($subparts[0]) {
						case 'nick':
							$nickCondition = $subparts[1];
							break;

						case 'date':
							$dateCondition = $subparts[1];
							break;
							
						case 'desc':
							$orderCondition = $subparts[1];
							break;
							
						case 'cont':
							return $this->handleContextSearch($subparts[1], $count);

						default:
							$dataConditions[] = $part;		
					}
				}
			}
		}

		$nickCondition = mysql_escape_string($nickCondition);
		$dataConditions = mysql_escape_string(implode(" ", $dataConditions));

		$clause = array();
		$singleDate = false;
		if ($dateCondition) {
			if (preg_match("/^-(\d+)$/", $dateCondition, $m)) {
				$date = strftime("%Y-%m-%d", strtotime("now -".$m[1]." days"));
				$clause[] = "date = '$date'";
				$singleDate = true;
			} elseif (preg_match("/^(\d{6})$/", $dateCondition, $m)) {
				$date = strftime("%Y-%m-%d", strtotime("20".$m[1]));
				$clause[] = "date = '$date'";
				$singleDate = true;
			}
		}	
		if ($nickCondition) {
			$clause[] = "nick LIKE '$nickCondition'";
		}
		
		$orderName = "DESC";
		if ($dateCondition)
		{
			$orderName = "ASC";
		}
		if (strlen($orderCondition)) {
			if (preg_match("/0/", $orderCondition))
				$orderName = "ASC";
		}
		if ($dataConditions) {
			$clause[] = " MATCH(data) AGAINST('\"$dataConditions\"' in boolean mode)"; //$dataConditions')";
		}

		//echo implode(" AND ", $clause);
		//die;
		$where = implode(" AND ", $clause);
		if (!$where)
			$where = "1";
		//sleep(10);
	
		$limit = 100;
		if ($singleDate)
			$limit = null;
	
			if (!$count) {
	    	$lines = $this->fetchAll($where, "id $orderName", $limit, $offset);
				if ($singleDate)
					return array('singleDate' => 'yes', 'lines' => $lines);
				else
					return array('lines' => $lines);
			} else {
				$c = $this->fetchCount($where); //->order('at DESC');
				return array('count' => $c);
			}
	}
	
	function handleContextSearch($id, $count)
	{
		if (!$count)
		{
			$id = mysql_real_escape_string($id);
			$theLine = $this->fetchAll("id = '$id'", "1", 1, 0);
			$theLine = $theLine[0];
			$where = "at <= '" . $theLine['at'] . "'";
			//$where = "id < '$id'";
			$lines = array_reverse($this->fetchAll($where, "at DESC", 17, 0));
			$where = "at > '" . $theLine['at'] . "'";
			//$where = "id => '$id'";
			$lines = array_merge($lines, $this->fetchAll($where, "at ASC", 17, 0));
			return array('lines' => $lines);
		}
		else
		{
			return array('count' => 34);
		}
	}

	function fetchCount($where)
	{
		$query = "SELECT COUNT(*) AS c FROM $this->table WHERE $where";
		$result = mysql_query($query);
		if (!$result)
		{
			die("Invalid count query.");
		}
		$row = mysql_fetch_object($result);
		return $row->c;
	}


	function fetchAll($where, $order, $limit, $offset)
	{
		$query = "SELECT * FROM $this->table WHERE $where ORDER BY $order";
		if (!is_null($limit))
		{
			$query .= " LIMIT $offset,$limit";
		}
				$this->queries[] = $query;
		#echo $query;
		$result = mysql_query($query);
		if (!$result)
		{
			die("Invalid query: $query");
		}
		$lines = array();
		while ($row = mysql_fetch_assoc($result))
		{
			$lines[] = $row;
		}
		return $lines;
	}
}

