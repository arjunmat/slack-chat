/*SlackChat*/
/* v1.5.5 */
(function( $ ) {

	var mainOptions = {};
	var userList;
	
	window.slackChat = false;

	var methods = {
		init: function (options) {
			this._defaults = {
        apiToken: '',		//#Slack token
        channelId: '',		//#Slack channel ID
        user: '',			//name of the user
        userLink: '', 		//link to the user in the application - shown in #Slack
        userImg: '',		//image of the user
        userId: '',			//id of the user in the application
        defaultSysImg: '',			//image to show when the support team replies
	      defaultSysUser: '',
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
        privateChannelId: false,
				isOpen: false,
				badgeElement: false,
				serverApiGateway: "/server/php/server.php",
				useUserDetails: false,
				defaultInvitedUsers: [],
				defaultUserImg: '/img/user-icon-small.jpg',
	   	};

			this._options = $.extend(true, {}, this._defaults, options);

			this._options.queryIntElem = null;
            this._options.latest = null;

            if(this._options.debug) console.log('This object :', this);

            window.slackChat._options = mainOptions = this._options;

            //validate the params
            if(this._options.apiToken == '') methods.validationError('Parameter apiToken is required.');
            if(this._options.channelId == '' && !this._options.privateChannel) methods.validationError('Parameter channelId is required.');
            if(this._options.user == '') methods.validationError('Parameter user is required.');
            if(this._options.defaultSysUser == '') methods.validationError('Parameter defaultSysUser is required.');
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
			html += '<textarea class="form-control slack-new-message" disabled="disabled" type="text" placeholder="Hang tight while we connect..."></textarea>';
			html += '<div class="slack-post-message"><i class="fa fa-fw fa-chevron-right"></i></div>';
			html += '</div>';
			html += '</div>';

			$('body').append(html);

			var $this = window.slackChat = this;

			//register events on the chatbox
			//1. query Slack on open
			$(this).on('click', function () {
				
				//reset the badgeElement
				if(window.slackChat._options.badgeElement)
					$(window.slackChat._options.badgeElement).html('').hide();
				
				//if the private channel functionality is used, set the isOpen flag to true.
				if(window.slackChat._options.privateChannel) window.slackChat._options.isOpen = true;
				//set the height of the messages box
				$('.slack-chat-box').show();
				$('.slack-chat-box').addClass('open');
				$('.slack-message-box').height($('.slack-chat-box').height() - $('.desc').height() - $('.send-area').height() - parseInt(window.slackChat._options.heightOffset));

				!function querySlackChannel(){
					if($('.slack-chat-box').hasClass('open') || window.slackChat._options.privateChannel) {
						methods.querySlack($this);
						setTimeout(querySlackChannel,  window.slackChat._options.queryInterval);
					}
				 
				}();

				$('.slackchat .slack-new-message').focus();
				
				if(window.slackChat._options.webCache) {
					//store the values in the webcache
					var scParams =  {
						apiToken: window.slackChat._options.apiToken
						,channelId: window.slackChat._options.channelId
						,user: window.slackChat._options.user
						,defaultSysUser: window.slackChat._options.defaultSysUser
						,botUser: window.slackChat._options.botUser
						,serverApiGateway: window.slackChat._options.serverApiGateway
						,defaultInvitedUsers: window.slackChat._options.defaultInvitedUsers
					};

					localStorage.scParams = JSON.stringify(scParams);
				}

			});

			//2. close the chat box
			$('.slackchat .slack-chat-close').on('click', function () {
				$('.slack-chat-box').slideUp();
				$('.slack-chat-box').removeClass('open');

				//clear the interval if the private channel feature is off
				if(!window.slackChat._options.privateChannel)
					clearInterval(window.slackChat._options.queryIntElem);
				//do not clear the interval if the private Channel feature is on. This allows the user to be shown notifications if there are new replies from the support team.
				else {
					window.slackChat._options.isOpen = false;
				}
			});


			//3. post message to slack
			$('.slackchat .slack-post-message').click(function () {
				methods.postMessage(window.slackChat, window.slackChat._options);
			});

			//4. bind the enter key to the text box
			$('.slackchat .slack-new-message').keyup(function(e) {
				if(window.slackChat._options.sendOnEnter)
				{
			   		var code = (e.keyCode ? e.keyCode : e.which);
			 		if(code == 13) 
			 		{
			 			methods.postMessage(window.slackChat, window.slackChat._options);
			 			e.preventDefault();
			 		}
			 	}
			});

			//get user online/offline status
			methods.getUserPresence(window.slackChat, window.slackChat._options);

			$(window).resize(function () {
				methods.resizeWindow();
			});
		},

		querySlack: function ($elem) {
			options = window.slackChat._options;

			methods.createChannel($elem, function (channel) {
				window.slackChat._options.channelId = channel.id;
				
				$('.slack-new-message').prop('disabled', false).prop('placeholder', 'Write a message...');
				
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
							window.slackChat._options.latest = resp.messages[0].ts;
							resp.messages = resp.messages.reverse();
							
							var repliesExist = 0;

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

									var messageText = methods.formatMessage(message.text.trim());

									//var messageText = methods.checkforLinks(message);

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

									//support replies exist
									repliesExist++;
									
									messageText = methods.formatMessage(resp.messages[i].text.trim());

									var userId = resp.messages[i].user;
                  var userName = options.defaultSysUser;
                  var userImg = options.defaultSysImg;

                  if (options.useUserDetails && userList.length) {
                    for (var uL = 0; uL < userList.length; uL++) {
                      var currentUser = userList[uL];
                      if (currentUser.id == userId) {
                        if (currentUser.real_name != undefined && currentUser.real_name.length > 0)
                          userName = currentUser.real_name;
                        else
                          userName = currentUser.name;

                        userImg = currentUser.profile.image_48;

                        break;
                      }
                    }
                  }

									html += "<div class='message-item'>";
									if(userImg !== '')
										html += "<div class='userImg'><img src='" + userImg + "' /></div>";
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
							
							//support team has replied and the chat box is closed
							if(repliesExist > 0 && window.slackChat._options.isOpen === false && window.slackChat._options.badgeElement) {
								$(window.slackChat._options.badgeElement).html(repliesExist).show();
								
							}
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
			
			//do not send the message if the value is empty
			if($('.slack-new-message').val().trim() === '') return false;

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
					,channel: window.slackChat._options.channelId
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
			console.log('[SlackChat Error] ' + errorTxt);
			return false;
		},

		getUserPresence: function ($elem) {
			var options = $elem._options;
			var active = false;
			userList = [];

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

			//added code for safely unbinding the element. thanks to @Jflinchum.
			$(window.slackChat).unbind('click');

			$('.slackchat').remove();
		},

		formatMessage: function (text) {
			
			//hack for converting to html entities
			var formattedText = $("<textarea/>").html(text).text();

			return unescape(formattedText)
			// <URL>
			.replace(/<(.+?)(\|(.*?))?>/g, function(match, url, _text, text) {
				if (!text) text = url;
				return $('<a>')
				.attr({
					href: url,
					target: '_blank'
				})
				.text(text)
				.prop('outerHTML');
			})
			// `code block`
			.replace(/(?:[`]{3,3})(?:\n)?([a-zA-Z0-9<>\\\.\*\n\r\-_ ]+)(?:\n)?(?:[`]{3,3})/g, function(match, code) {
				return $('<code>').text(code).prop('outerHTML');
			})
			// `code`
			.replace(/(?:[`]{1,1})([a-zA-Z0-9<>\\\.\*\n\r\-_ ]+)(?:[`]{1,1})/g, function(match, code) {
				return $('<code>').text(code).prop('outerHTML');
			})
			// new line character
			.replace(/\n/g, "<br />");
		},

		createChannel: function($elem, callback) {

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

			var privateChannelName = options.user + '-' + (options.userId?options.userId:(Math.random()*100000));		
			
			var payLoad = {
				channelName: privateChannelName
			};

			if(options.defaultInvitedUsers.length > 0) {
				payLoad.invitedUsers = JSON.stringify($.trim(options.defaultInvitedUsers));
			}

			$.ajax({
				url: options.serverApiGateway
				,dataType: 'json'
				,type: "POST"
				,data: payLoad
				,success: function (resp) {
					if(resp.ok) {
						options.privateChannelId = window.slackChat._options.privateChannelId = resp.data.id;
						callback(resp.data);
					}

					return false;
				}
				,error: function () {
					return false;
				}
			});
		},

		resizeWindow: function () {
			$('.slack-message-box').height($('.slack-chat-box').height() - $('.desc').height() - $('.send-area').height() - parseInt(window.slackChat._options.heightOffset));
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
