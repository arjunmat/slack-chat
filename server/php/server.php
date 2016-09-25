<?php

	/****
	* Example code for creating a channel when private channels are used in SlackChat.
	*
	* v1.5 - added feature to invite a list of users to a private channel created
	* 
	* The API Token used must be that of a user with Create permissions.
	*/

	define('SLACK_API_URL', 'https://slack.com/api/channels.join');
	define('SLACK_API_INVITE_URL', 'https://slack.com/api/channels.invite');
	define('SLACK_API_USER_IDENTITY_URL', 'https://slack.com/api/users.identity');
	define('SLACK_API_USER_TOKEN', '<Replace with your #Slack token>');

	$channelName = $_POST['channelName'];
	$invitedUsers = isset($_POST['invitedUsers'])?json_decode($_POST['invitedUsers'], true):[];
	
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

				/* Invite the token user to the channel, if no other users are invited*/
				if(empty($invitedUsers)) {

					$chUserInfo = curl_init(SLACK_API_USER_IDENTITY_URL);

					$payLoadUser = [
						"token" => SLACK_API_USER_TOKEN
					];

					curl_setopt($chUserInfo, CURLOPT_HEADER, 0);
					curl_setopt($chUserInfo, CURLOPT_RETURNTRANSFER, 1);
					curl_setopt($chUserInfo, CURLOPT_POSTFIELDS, $payLoadUser);

					if(!$userIdentity = curl_exec($chUserInfo)) {
						throw new Exception ("Failed to get current user identity: ");
					}

					$invitedUsers[] = $userIdentity;
				}

				/* Invite users to join the #Slack channel created */
				foreach($invitedUsers as $user) {
					$chInvite = curl_init(SLACK_API_INVITE_URL);

					$payLoadInvite = [
						"token" => SLACK_API_USER_TOKEN
						,"channel" => $slackData->channel->id
						,"user"	=> $user
					];

					curl_setopt($chInvite, CURLOPT_HEADER, 0);
					curl_setopt($chInvite, CURLOPT_RETURNTRANSFER, 1);
					curl_setopt($chInvite, CURLOPT_POSTFIELDS, $payLoadInvite);

					if(!$inviteResult = curl_exec($chInvite)) {
						throw new Exception ("Failed to invite user: " . $user);
					}
					else {
						$slackDataInvite = json_decode($inviteResult);

						if(!$slackDataInvite->ok) {

							switch($slackDataInvite->error) {
								case 'already_in_channel':
								case 'cant_invite_self':
								case 'user_not_found':
								case 'account_inactive':
								case 'user_is_bot':
								case 'cant_invite':
									$returnArr["warnings"][] = $user. ":" . $slackDataInvite->error;
									break;
								default:
									throw new Exception($slackDataInvite->error);
									break;
							}
						}
					}

					curl_close($chInvite);

				}

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