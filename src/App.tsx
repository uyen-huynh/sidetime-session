import { useEffect, useState, useCallback, useReducer, useMemo } from 'react';
import ZoomVideo, { ConnectionState, ReconnectReason } from '@zoom/videosdk';
import { Modal, message } from 'antd';
import 'antd/dist/antd.min.css';
import produce from 'immer';
import Video from './feature/video/video';
import VideoSingle from './feature/video/video-single';
import VideoNonSAB from './feature/video/video-non-sab';
import ZoomContext from './context/zoom-context';
import ZoomMediaContext from './context/media-context';
import LoadingLayer from './component/loading-layer';
import { MediaStream } from './index-types';
import './App.css';
import ApplicationContext from './context/application-context';

import noop from 'lodash/noop';
import merge from 'lodash/merge';
import ChatContainer from './feature/chat/chat';

const zmClient = ZoomVideo.createClient();
interface AppProps {
  meetingArgs: {
    topic: string;
    signature: string;
    name: string;
    password?: string;
    groupSession?: boolean;
  };
  applicationProviderValue: {
    toast?: any;
    onSessionClose?: any;
    audioOnly?: boolean;
  };
}
const mediaShape = {
  audio: {
    encode: false,
    decode: false
  },
  video: {
    encode: false,
    decode: false
  },
  share: {
    encode: false,
    decode: false
  }
};

const mediaReducer = produce((draft, action) => {
  switch (action.type) {
    case 'audio-encode': {
      draft.audio.encode = action.payload;
      break;
    }
    case 'audio-decode': {
      draft.audio.decode = action.payload;
      break;
    }
    case 'video-encode': {
      draft.video.encode = action.payload;
      break;
    }
    case 'video-decode': {
      draft.video.decode = action.payload;
      break;
    }
    case 'share-encode': {
      draft.share.encode = action.payload;
      break;
    }
    case 'share-decode': {
      draft.share.decode = action.payload;
      break;
    }
    case 'reset-media': {
      Object.assign(draft, { ...mediaShape });
      break;
    }
    default:
      break;
  }
}, mediaShape);

declare global {
  interface Window {
    webEndpoint: string | undefined;
    zmClient: any | undefined;
    mediaStream: any | undefined;
    crossOriginIsolated: boolean;
    ltClient: any | undefined;
  }
}

function App(props: AppProps) {
  const {
    meetingArgs: { topic, signature, name, password, groupSession },
    applicationProviderValue
  } = merge({ applicationProviderValue: { toast: message, onSessionClose: noop, audioOnly: false } }, props);

  const [loading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('');
  const [isFailover, setIsFailover] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('closed');
  const [mediaState, dispatch] = useReducer(mediaReducer, mediaShape);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isSupportGalleryView, setIsSupportGalleryView] = useState<boolean>(true);
  const [openSessionChat, setOpenSessionChat] = useState<boolean>(false);

  const { toast, onSessionClose } = applicationProviderValue;

  const mediaContext = useMemo(() => ({ ...mediaState, mediaStream }), [mediaState, mediaStream]);
  const galleryViewWithoutSAB = groupSession && !window.crossOriginIsolated;

  useEffect(() => {
    const init = async () => {
      await zmClient.init('en-US', 'Global', {
        patchJsMedia: true,
        enforceMultipleVideos: true,
        enforceVirtualBackground: galleryViewWithoutSAB,
        stayAwake: true
      });
      try {
        setLoadingText('Joining the session...');
        await zmClient.join(topic, signature, name, password).catch((e) => {
          toast.error(e.reason);
          onSessionClose();
        });
        const stream = zmClient.getMediaStream();
        setMediaStream(stream);
        setIsSupportGalleryView(stream.isSupportMultipleVideos());
        setIsLoading(false);
      } catch (e: any) {
        setIsLoading(false);
        toast.error(e.reason);
      }
    };
    init();
    return () => {
      ZoomVideo.destroyClient();
    };
  }, [signature, topic, name, password, galleryViewWithoutSAB, toast, onSessionClose]);
  const onConnectionChange = useCallback(
    (payload) => {
      if (payload.state === ConnectionState.Reconnecting) {
        setIsLoading(true);
        setIsFailover(true);
        setStatus('connecting');
        const { reason, subsessionName } = payload;
        if (reason === ReconnectReason.Failover) {
          setLoadingText('Session Disconnected,Try to reconnect');
        } else if (reason === ReconnectReason.JoinSubsession || reason === ReconnectReason.MoveToSubsession) {
          setLoadingText(`Joining ${subsessionName}...`);
        } else if (reason === ReconnectReason.BackToMainSession) {
          setLoadingText('Returning to Main Session...');
        }
      } else if (payload.state === ConnectionState.Connected) {
        setStatus('connected');
        if (isFailover) {
          setIsLoading(false);
        }
        window.zmClient = zmClient;
        window.mediaStream = zmClient.getMediaStream();
      } else if (payload.state === ConnectionState.Closed) {
        setStatus('closed');
        dispatch({ type: 'reset-media' });
        if (payload.reason === 'ended by host') {
          toast.warning('This meeting has been ended by host');
          onSessionClose();
        }
      }
    },
    [isFailover, onSessionClose, toast]
  );
  const onMediaSDKChange = useCallback((payload) => {
    const { action, type, result } = payload;
    dispatch({ type: `${type}-${action}`, payload: result === 'success' });
  }, []);

  const onDialoutChange = useCallback((payload) => {
    console.log('onDialoutChange', payload);
  }, []);

  const onAudioMerged = useCallback((payload) => {
    console.log('onAudioMerged', payload);
  }, []);

  useEffect(() => {
    zmClient.on('connection-change', onConnectionChange);
    zmClient.on('media-sdk-change', onMediaSDKChange);
    zmClient.on('dialout-state-change', onDialoutChange);
    zmClient.on('merged-audio', onAudioMerged);
    return () => {
      zmClient.off('connection-change', onConnectionChange);
      zmClient.off('media-sdk-change', onMediaSDKChange);
      zmClient.off('dialout-state-change', onDialoutChange);
      zmClient.off('merged-audio', onAudioMerged);
    };
  }, [onConnectionChange, onMediaSDKChange, onDialoutChange, onAudioMerged]);

  const handleClickChatButton = useCallback(() => setOpenSessionChat(!openSessionChat), [openSessionChat]);

  const applicationContextValue = useMemo(
    () => ({ ...applicationProviderValue, handleClickChatButton, openSessionChat }),
    [applicationProviderValue, handleClickChatButton, openSessionChat]
  );

  return (
    <ApplicationContext.Provider value={applicationContextValue}>
      <ZoomContext.Provider value={zmClient}>
        <div className="App">
          <ZoomMediaContext.Provider value={mediaContext}>
            {loading && <LoadingLayer content={loadingText} />}
            {!loading && (
              <>
                {isSupportGalleryView ? <Video /> : galleryViewWithoutSAB ? <VideoNonSAB /> : <VideoSingle />}
                <ChatContainer />
              </>
            )}
          </ZoomMediaContext.Provider>
        </div>
      </ZoomContext.Provider>
    </ApplicationContext.Provider>
  );
}

export default App;
