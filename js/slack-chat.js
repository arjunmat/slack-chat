/*SlackChat*/
/* v1.1.3 */
(function( $ ) {

	var mainOptions = {};

	var methods = {
		init: function (options) {
			this._defaults = {
                apiToken: '',		//#Slack token
	            channelId: '',		//#Slack channel ID
	            user: '',			//name of the user
	            userLink: '', 		//link to the user in the application - shown in #Slack
	            userImg: '',		//image of the user
	            userId: '',			//id of the user in the application
	            sysImg: '',			//image to show when the support team replies
	            sysUser: '',
	            queryInterval: 3000,
	            chatBoxHeader: "Need help? Talk to our support team right here",
	            slackColor: "#36a64f",
	            messageFetchCount: 100,
	            botUser: '',		//username to post to #Slack
	            sendOnEnter: true,
	            disableIfAway: false,
	            elementToDisable: null,
	            heightOffset: 75,
	            debug: false,
	            defaultUserImg: '',
	            webCache: false,
	            privateChannel: false,
	            privateChannelId: false
	        };

			this._options = $.extend(true, {}, this._defaults, options);

			this._options.queryIntElem = null;
            this._options.latest = null;

            if(this._options.debug) {
            	console.log('This object :');
            	console.log(this);
            }

            mainOptions = this._options;

            //validate the params
            if(this._options.apiToken == '') methods.validationError('Parameter apiToken is required.');
            if(this._options.channelId == '') methods.validationError('Parameter channelId is required.');
            if(this._options.user == '') methods.validationError('Parameter user is required.');
            if(this._options.sysUser == '') methods.validationError('Parameter sysUser is required.');
            if(this._options.botUser == '') methods.validationError('Parameter botUser is required.');
            if(typeof moment == 'undefined') methods.validationError('MomentJS is not available. Get it from http://momentjs.com');

            //if disabling is set, then first hide the element and show only if users are online
            if(this._options.disableIfAway && this._options.elementToDisable !== null) this._options.elementToDisable.hide();

			//create the chat box
			var html = '<div class="slackchat slack-chat-box">';
			html += '<div class="slack-chat-header">';
			html += '<button class="close slack-chat-close">&times;</button>';
			html += this._options.chatBoxHeader;
			html += "<div class='presence'><div class='presence-icon'>&#8226;</div><div class='presence-text'></div></div>";
			html += '</div>';
			html += '<div class="slack-message-box">';
			html += '</div>';
			html += '<div class="send-area">';
			html += '<textarea class="form-control slack-new-message" type="text" placeholder="Write a message..."></textarea>';
			html += '<div class="slack-post-message"><i class="fa fa-fw fa-chevron-right"></i></div>';
			html += '</div>';
			html += '</div>';

			$('body').append(html);

			var $this = this;

			//register events on the chatbox
			//1. query Slack on open
			$(this).on('click', function () {
				//set the height of the messages box
				$('.slack-chat-box').show();
				$('.slack-chat-box').addClass('open');
				$('.slack-message-box').height($('.slack-chat-box').height() - $('.desc').height() - $('.send-area').height() - parseInt($this._options.heightOffset));

				!function querySlackChannel(){
					if($('.slack-chat-box').hasClass('open')) {
						methods.querySlack($this);
						setTimeout(querySlackChannel,  $this._options.queryInterval);
					}
				 
				}();

				$('.slackchat .slack-new-message').focus();
				
				if($this._options.webCache) {
					//store the values in the webcache
					var scParams =  {
						apiToken: mainOptions.apiToken
						,channelId: mainOptions.channelId
						,user: mainOptions.user
						,sysUser: mainOptions.sysUser
						,botUser: mainOptions.botUser
					};

					localStorage.scParams = JSON.stringify(scParams);
				}

			});

			//2. close the chat box
			$('.slackchat .slack-chat-close').on('click', function () {
				$('.slack-chat-box').slideUp();
				$('.slack-chat-box').removeClass('open');

				//clear the interval
				clearInterval($this._options.queryIntElem);
			});


			//3. post message to slack
			$('.slackchat .slack-post-message').click(function () {
				methods.postMessage($this, $this._options);
			});

			//4. bind the enter key to the text box
			$('.slackchat .slack-new-message').keyup(function(e) {
				if($this._options.sendOnEnter)
				{
			   		var code = (e.keyCode ? e.keyCode : e.which);
			 		if(code == 13) 
			 		{
			 			methods.postMessage($this, $this._options);
			 			e.preventDefault();
			 		}
			 	}
			});

			//get user online/offline status
			methods.getUserPresence($this, $this._options);
		},

		querySlack: function ($elem) {
			options = mainOptions;

			methods.createChannel($elem, function (channel) {
				mainOptions.channelId = channel.id;

				$.ajax({
					url: 'https://slack.com/api/channels.history'
					,type: "POST"
					,dataType: 'json'
					,data: {
						token: options.apiToken
						,channel: mainOptions.channelId
						,oldest: mainOptions.latest
						,count: options.messageFetchCount
					}
					,success: function (resp) {

						if(options.debug && resp.messages && resp.messages.length) console.log(resp.messages);

						if(resp.ok && resp.messages.length) {
							var html = '';
							mainOptions.latest = resp.messages[0].ts;
							resp.messages = resp.messages.reverse();

							for(var i=0; i< resp.messages.length; i++)
							{
								if(resp.messages[i].subtype == 'bot_message' && resp.messages[i].text !== "") {
									
									message = resp.messages[i];
									var userName = '';
									var userImg = '';
									var msgUserId = '';

									if(message.attachments)
									{
										userName = message.attachments[0].author_name;
										userImg = message.attachments[0].author_icon;
									}

									if(message.fields)
										msgUserId = message.fields[0].value;

									var messageText = methods.checkforLinks(message.text.trim());

									html += "<div class='message-item'>";
									if(userImg !== '' && typeof userImg !== 'undefined')
										html += "<div class='userImg'><img src='" + userImg + "' /></div>";
									else if(options.defaultUserImg !== '')
										html += "<div class='userImg'><img src='" + options.defaultUserImg + "' /></div>";
									html += "<div class='msgBox'>";
									if(msgUserId !== '')
										html += "<div class='username'>" + (msgUserId == options.userId? "You":userName) + "</div>";
									else
										html += "<div class='username'>" + userName + "</div>";
									html += "<div class='message'>" + messageText + "</div>";
									if(typeof moment !== 'undefined')
										html += "<div class='timestamp'>" + moment.unix(resp.messages[i].ts).fromNow() + "</div>";
									html += "</div>";
									html += "</div>";
								}
								else if(typeof resp.messages[i].subtype == 'undefined') {

									message = resp.messages[i].text;
									var userName = options.sysUser;
									var messageText = methods.checkforLinks(message);
									html += "<div class='message-item'>";
									if(options.sysImg !== '')
										html += "<div class='userImg'><img src='" + options.sysImg + "' /></div>";
									html += "<div class='msgBox'>"
									html += "<div class='username main'>" + userName + "</div>";
									html += "<div class='message'>" + messageText + "</div>";
									if(typeof moment !== 'undefined')
										html += "<div class='timestamp'>" + moment.unix(resp.messages[i].ts).fromNow() + "</div>";
									html += "</div>";
									html += "</div>";
								}
							}
							$('.slack-message-box').append(html);
							
							//scroll to the bottom
							$('.slack-message-box').stop().animate({
		  						scrollTop: $(".slack-message-box")[0].scrollHeight
							}, 800);
						}
						else if(!resp.ok)
						{
							console.log('[SlackChat] Query failed with errors: ');
							console.log(resp);
						}
					}
				});
			});

			
		},

		postMessage: function ($elem) {

			var options = $elem._options;		

			var attachment = {};

			attachment.fallback = "View " + options.user + "'s profile";
			attachment.color = options.slackColor;
			attachment.author_name = options.user;

			if(options.userLink !== '') attachment.author_link = options.userLink;
			if(options.userImg !== '') attachment.author_icon = options.userImg;
			if(options.userId !== '') attachment.fields = [
				{
					"title": "ID",
                    "value": options.userId,
                    "short": true
				}
			];

			message = $('.slack-new-message').val();
			$('.slack-new-message').val('');

			if(options.debug) {
				console.log('Posting Message:');
				console.log({ message: message, attachment: attachment, options: options});
			}

			$.ajax({
				url: 'https://slack.com/api/chat.postMessage'
				,type: "POST"
				,dataType: 'json'
				,data: {
					token: options.apiToken
					,channel: mainOptions.channelId
					,text: message
					,username: options.botUser
					,attachments: JSON.stringify([attachment])
				}
				,success: function (resp) {
					if(!resp.ok) {
						$('.slack-new-message').val(message);
						console.log('[SlackChat] Post Message failed with errors: ');
						console.log(resp);
					}
				}
			});
		},

		validationError: function (errorTxt) {
			$.error('[SlackChat Error] ' + errorTxt);
			return false;
		},

		getUserPresence: function ($elem) {
			var options = $elem._options;
			var active = false;
			var userList = [];

			$.ajax({
				url: 'https://slack.com/api/users.list'
				,type: "POST"
				,dataType: 'json'
				,data: {
					token: options.apiToken
				}
				,success: function (resp) {
					if(resp.ok) {
						userList = resp.members;

						if(userList.length) {
							for(var i=0; i<userList.length; i++) {
								if(active) break;
								if(userList[i].is_bot) continue;
								
								$.ajax({
									url: 'https://slack.com/api/users.getPresence'
									,dataType: 'json'
									,type: "POST"
									,data: {
										token: options.apiToken
										,user: userList[i].id
									}
									,success: function (resp) {
										if(resp.ok) {
											if(resp.presence === 'active')
											{
												$('.slackchat .presence').addClass('active');
												$('.slackchat .presence .presence-text').text('Available');
												if(options.disableIfAway && options.elementToDisable !== null) options.elementToDisable.show();
												active = true;
												return true;
											}
											else if(!active) {
												$('.slackchat .presence').removeClass('active');
												$('.slackchat .presence .presence-text').text('Away');
											}
										}
									}
								});
							}
						}
					}
				}
			});			
		},

		destroy: function ($elem) {
			$($elem).unbind('click');

			$('.slackchat').remove();
		},

		checkforLinks: function (text) {
			var regex = /.*<[a-zA-Z0-9\/:\-.]+|[a-zA-Z0-9\/:\-.]+>.*/;
			var startIndex = 0;

			if(regex.test(text))
			{
				while(startIndex <= text.indexOf('<http'))
				{
					linkStartIndex = text.indexOf('<http');
					linkEndIndex = text.indexOf('>', linkStartIndex)+1;

					var link = text.substring(linkStartIndex, linkEndIndex);
					startIndex += (linkStartIndex + text.indexOf('>')+1);

					//extract the link portion
					var linkProc = {};
					if(link.indexOf('|')) {

						linkProc.url = link.substr(1, link.indexOf('|')-1);
						linkProc.text = link.substring(link.indexOf('|')+1, link.length-1);	
					}
					else {

						linkProc.url = link.substr(1, link.indexOf('>')-1);
						linkProc.text = link.substring(link.indexOf('>')+1, link.length-1);
						linkProc.text =linkProc.url;
					}

					var linkHTML = "<a href='" + linkProc.url + "' target='_blank'>" + linkProc.text + "</a>";

					text = text.replace(link, linkHTML);
				}
			}

			return text;
		}

		,createChannel: function($elem, callback) {

			var options = $elem._options;

			if(!options.privateChannel) {
				var channel = {
					id: options.channelId
				};

				callback(channel);
				
				return false;				
			}

			if(options.privateChannelId) {

				var channel = {
					id: options.privateChannelId
				};

				callback(channel);
				
				return false;
			}

			var privateChannelName = options.user + '' + (Math.random()*10000000);		

			$.ajax({
				url: 'https://slack.com/api/channels.create'
				,dataType: 'json'
				,type: "POST"
				,data: {
					token: options.apiToken
					,name: privateChannelName
				}
				,success: function (resp) {
					if(resp.ok) {
						mainOptions.privateChannelId = resp.channel.id;
						callback(resp.channel);
					}

					return false;
				}
				,error: function () {
					return false;
				}
			});
		}
	};
 
    $.fn.slackChat = function( methodOrOptions ) {

    	if(methods[methodOrOptions]) {
    		return methods[ methodOrOptions ].apply( this, Array.prototype.slice.call( arguments, 1 ));
    	}
    	else if ( typeof methodOrOptions === 'object' || ! methodOrOptions ) {
    		methods.init.apply( this, arguments );
    	}
    	else {
            $.error( 'Method ' +  methodOrOptions + ' does not exist on jQuery.slackChat' );
        }
    };
 
}( jQuery ));