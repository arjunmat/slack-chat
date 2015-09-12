<?php

	/****
	* Example code for creating a channel when private channels are used in SlackChat.
	*
	* The API Token used must be that of a user with Create permissions.
	*/

	define('SLACK_API_URL', 'https://slack.com/api/channels.join');
	define('SLACK_API_USER_TOKEN', '<Replace with your #Slack token>');

	$channelName = $_POST['channelName'];
	
	/* Define the payload to be sent to Slack to create the channel */
	$payLoad = [
		"token" => SLACK_API_USER_TOKEN
		,"name" => $channelName
	];

	/* The return array to be sent to slackChat client */
	$returnArr = [
		"ok" => false
		,"data" => ""
		,"err"	=> ""	
	];

	try {
		/* Send the request to Slack API */
		$ch = curl_init(SLACK_API_URL);
		
		curl_setopt($ch, CURLOPT_HEADER, 0);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
		curl_setopt($ch, CURLOPT_POSTFIELDS, $payLoad);

		if($result = curl_exec($ch)) {
			
			$slackData = json_decode($result);
			
			if($slackData->ok) {
				/* Channel created or joined. Return the channel ID */
				$returnArr["data"] = ["id" => $slackData->channel->id];
				$returnArr["ok"] = true;
			}
			else {
				throw new Exception($slackData->error);
			}
		}
		else {
			throw new Exception("Unable to connect to #Slack servers");
		}
	}
	catch(Exception $e) {
		$returnArr["err"] = $e->getMessage();
	}

	curl_close($ch);
	echo json_encode($returnArr);
?>