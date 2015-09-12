### Slack-Chat.
Slack-Chat is a jQuery plugin that integrates a support chat system with your web app allowing your users to communicate with your team on Slack effectively and address queries faster.

When users send a message, it will show up as a chat in the Channel specified by you.

### Changelog
v1.3
> 1. Added server PHP example and documentation for Private Channels
> 2. Disabled the textbox while connecting to slackchat

v1.2
> 1. bug fixes and performance improvements
> 2. Added support for webCache and privateChannel

v1.1
> 1. added support for links posted from slack
> 2. added option defaultUserImg, an image link - will be shown if the userImg parameter is blank
> 3. responsive layouts

v1.0
> 1. Initial commit

### Requirements
Slack-Chat requires MomentJS. (http://momentjs.com)

### Installation
1. Download and add the JavaScript and CSS files to your web-app.
2. Call Slack-Chat on the element that triggers the chat system.
````
var slackChatOptions = {
                apiToken: '',	        //#Slack Auth token. Required. 
	            channelId: '',		//#Slack channel ID. Required.
	            user: '',			//name of the user. Required.
	            userLink: '', 		//link to the user in the application - shown in #Slack
	            userImg: '',		//image of the user
	            userId: '',			//id of the user in the application
	            sysImg: '',			//image to show when the support team replies
	            sysUser: '',                //Required.   
	            queryInterval: 3000,
	            chatBoxHeader: "Need help? Talk to our support team right here",
	            slackColor: "#36a64f",
	            messageFetchCount: 100,
	            botUser: '',		//username to post to #Slack. Required.
	            sendOnEnter: true,
	            disableIfAway: false,
	            elementToDisable: null,
	            heightOffset: 75,
	            debug: false,
	            defaultUserImg: '',
	            webCache: false
}

$(<elem>).slackChat(slackChatOptions);
````
### Options

**apiToken** (Required)

Your Slack Token. Generate one at https://api.slack.com/web if you don't have one.

**channelId** (Required)

ID of the Slack Channel the messages should appear in.

**user** (Required)

Name of the user.

**userLink**

Link to the user in your web-app. This will be show in Slack for quick reference for your support team.

**userImg**

A link to the profile image of the user.

**userId**

Your web-app ID of the user. For reference for your support team.

**sysUser**(Required)

The text that will be displayed when your support team writes on the channel.

**sysImg**

The image to be displayed when your support team writes on the channel.

**queryInterval**

Polling interval on the channel. Default: 3000

**chatBoxHeader**

Customize the header HTML on the Chat Strip

Default:"Need help? Talk to our support team right here"

**slackColor**

A hex color code used to identify messages from Slack-Chat in Slack

**messageFetchCount**

Number of messages to fetch for each poll.

Default: 100

**botUser** (Required)

A name that messages will be posted on Slack as.

**sendOnEnter**

Send the message when the user presses enter on the textbox.

Default: true

**disableIfAway**

Disable the Support if there are no online users in your Slack team

**elementToDisable**

The jQuery element that must be disabled. Ex. $('.slackChatTrigger')

Used only in conjunction with disableIfAway

**heightOffset**

To adjust the height of the message window in pixels.

Default: 75

**debug**

Shows a few debug messages if set to true.

Default: false

**defaultUserImg**

The image link to use if the userImg parameter is '' for a message.

**webCache**

A few options will be cached in the client for debugging/local testing. The values from the localStorage can be retrieved as follows.

```javascript
//load from localStorage
for ( var i = 0, len = localStorage.length; i < len; ++i ) {

	if(localStorage.key(i) == 'scParams') {
		var scParams = JSON.parse(localStorage.getItem( localStorage.key( i ) ));

		$('#apiToken').val(scParams.apiToken);
		$('#channelId').val(scParams.channelId);
		$('#user').val(scParams.user);
		$('#sysUser').val(scParams.sysUser);
		$('#botUser').val(scParams.botUser);
	}
}
```

**privateChannel**

Create a private channel for the support, instead of a common channel.

### Try it yourself here
Try a demo here. http://slack-chat.improvi.in

### Authors and Contributors
Created by Arjun Mathai. Send any error logs, feature requests, etc to arjun.mathai@gmail.com