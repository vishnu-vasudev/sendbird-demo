import "./App.css";
import React, { useEffect, useState, useRef, useMemo } from "react";
import SendbirdChat from "@sendbird/chat";
import SendBirdCall from "sendbird-calls";
import {
  GroupChannelModule,
  GroupChannelCreateParams,
  GroupChannel,
  GroupChannelListQueryParams,
  GroupChannelListQuery,
} from "@sendbird/chat/groupChannel";
import {
  PreviousMessageListQuery,
  PreviousMessageListQueryParams,
  UserMessage,
  UserMessageCreateParams,
} from "@sendbird/chat/message";

const App = () => {
  // const [sb, setSb] = useState();
  const [channelNames, setChannelNames] = useState([]);
  const [newGroupName, setNewGroupName] = useState<string>();
  const [allChannels, setAllChannels] = useState<object>();
  const [msg, setMsg] = useState<object>();
  const [currentChannel, setCurrentChannel] = useState("");
  const [newMessage, setNewMessage] = useState();
  const [calleeId, setCalleeId] = useState<string>("");
  const USER_ID = "User2";
  const appId = "6419EB19-5274-4A82-A194-3AE6D8B8C4BF";
  var sb: object;

  useEffect(() => {
    connect();
  }, []);

  const myRef = useRef(null);
  const executeScroll = () => myRef.current.scrollIntoView();

  const connect = async () => {
    SendBirdCall.init(appId);
    const sendbirdChat = SendbirdChat.init({
      appId: appId,
      modules: [new GroupChannelModule()],
    });
    try {
      sendbirdChat.connect(USER_ID);
    } catch (err) {
      // Handle error.
    }
    sb = sendbirdChat;
  };

  const createGroup = async () => {
    try {
      const groupChannelParams = {
        name: `${newGroupName}`,
      };
      sb.groupChannel.createChannel(groupChannelParams);
    } catch (error) {}
  };

  const groupList = async () => {
    const array: string[] = [];
    const [channels, error] = await loadChannels();
    setAllChannels(channels);
    for (let i = 0; i < channels.length; i++) {
      array.push(channels[i].name);
      // setChannelNames((channelNames) => [...channelNames, channels[i].name]);
    }
    // await channels[0].enter();

    setChannelNames(array);
  };

  const loadChannels = async () => {
    try {
      const groupChannelQuery = sb.groupChannel.createMyGroupChannelListQuery({
        limit: 100,
        includeEmpty: true,
      });
      const channels = await groupChannelQuery.next();

      return [channels, null];
    } catch (error) {
      return [null, error];
    }
  };

  const retrieveMsg = async (name) => {
    for (let i = 0; i < allChannels.length; i++) {
      if (allChannels[i].name === name) {
        allChannels[i].members.map((value) => {
          if (value.userId !== USER_ID) {
            setCalleeId(value.userId);
          }
        });
        setCurrentChannel(allChannels[i]);
        const params: PreviousMessageListQueryParams = {
          limit: 100,
        };
        const query: PreviousMessageListQuery =
          allChannels[i].createPreviousMessageListQuery(params);

        const messages = await query.load();
        setMsg(messages);
      }
    }
    executeScroll();
  };

  const sendMsg = async () => {
    const params: UserMessageCreateParams = {
      // UserMessageCreateParams can be imported from @sendbird/chat/message.
      message: newMessage,
    };

    currentChannel
      .sendUserMessage(params)
      .onPending((message: UserMessage) => {
        // The pending message for the message being sent has been created.
        // The pending message has the same reqId value as the corresponding failed/succeeded message.
      })
      .onFailed((err: Error, message: UserMessage) => {
        // Handle error.
      })
      .onSucceeded((message: UserMessage) => {
        // The message is successfully sent to the channel.
        // The current user can receive messages from other users through the onMessageReceived() method of an event handler.
        retrieveMsg(currentChannel.name);
      });
    executeScroll();
  };

  const message: string[] = [];

  if (msg) {
    console.log(msg);
    for (let i = 0; i < msg.length; i++) {
      if (msg[i].sender.userId === USER_ID) {
        if (i === msg.length - 1) {
          message.push(
            <p ref={myRef} className="sending-msg">
              {msg[i].message}
            </p>
          );
        } else {
          message.push(<p className="sending-msg">{msg[i].message}</p>);
        }
      } else {
        // setCalleeId(calledId => msg[i].sender.userId)
        if (i === msg.length - 1) {
          message.push(
            <p ref={myRef} className="receiving-msg">
              {msg[i].sender.nickname} {msg[i].message}
            </p>
          );
        } else {
          message.push(
            <p className="receiving-msg">
              {msg[i].sender.nickname} {msg[i].message}
            </p>
          );
        }
      }
    }
  }

  const callHandle = () => {
    const authOption = { userId: USER_ID };
    SendBirdCall.authenticate(authOption, (result, error) => {
      if (error) {
        // Handle authentication failure.
      } else {
        console.log("user authencated");
        SendBirdCall.connectWebSocket()
          .then(console.log("websocket succeeded"))
          .catch(/* Failed to connect */);
        const dialParams = {
          userId: calleeId,
          isVideoCall: true,
          callOption: {
            // localMediaView: document.getElementById("local_video_element_id"),
            // remoteMediaView: document.getElementById("remote_video_element_id"),
            audioEnabled: true,
            videoEnabled: true,
          },
        };
        const call = SendBirdCall.dial(dialParams, (call, error) => {
          if (error) {
            console.log(error);
          } else {
            console.log("call success");
          }

          // Dialing succeeded.
        });

        // The user has been successfully authenticated and is connected to the Sendbird server.
        //...
      }
    });

    const dialParams = {
      userId: calleeId,
      isVideoCall: true,
      callOption: {
        // localMediaView: document.getElementById('local_video_element_id'),
        remoteMediaView: document.getElementById("remote_video_element_id"),
        audioEnabled: true,
        videoEnabled: true,
      },
    };
    const call = SendBirdCall.dial(dialParams, (call, error) => {
      if (error) {
        console.log("error");
      } else {
        console.log("call success");
      }

      // Dialing succeeded.
    });

    call.onEstablished = (call) => {
      console.log("established");
    };

    call.onConnected = (call) => {
      //...
    };

    call.onEnded = (call) => {
      //...
    };
  };

  const handleClick = (value) => {
    // const d = value;
    retrieveMsg(value).then(() => {
      executeScroll();
    });
  };

  return (
    <>
      <input
        placeholder="Enter new channel name"
        onChange={(e) => {
          setNewGroupName(e.target.value);
        }}
      />
      <button onClick={createGroup}>click</button>
      <button onClick={groupList}>channellist</button>
      <div className="display-flex container">
        <div className="example display-flex flex-column channel-list">
          <h2 className="channel-header">Messages</h2>
          {channelNames.map((value) => (
            <p
              key={value}
              onClick={() => handleClick(value)}
              className="channel-name"
            >
              {value}
            </p>
          ))}
        </div>
        <div className="msg-container">
          <div>
            <div className="group-name display-flex">
              <h3>{currentChannel.name}</h3>
              <button onClick={callHandle} className="call-btn">
                Call
              </button>
            </div>

            <div className="example messages display-flex flex-column">
              {message}
            </div>
            
          </div>
          <div className="input-msg">
              <input
                className="msg-input-box"
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type new message"
              />
              <button className="send-btn" onClick={sendMsg}>
                send
              </button>
            </div>
        </div>
      </div>
      <button onClick={executeScroll}>click</button>
      {/* {executeScroll} */}
      <video id="remote_video_element_id"></video>
    </>
  );
};

export default App;
