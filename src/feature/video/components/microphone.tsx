/* eslint-disable no-nested-ternary */
import { useState, useEffect, useMemo } from 'react';
import { Tooltip, Dropdown, Button } from 'antd';
import classNames from 'classnames';
import { AudioOutlined, AudioMutedOutlined, CheckOutlined, UpOutlined } from '@ant-design/icons';
import { IconFont } from '../../../component/icon-font';
import { MediaDevice } from '../video-types';
import CallOutModal from './call-out-modal';
import { getAntdDropdownMenu, getAntdItem } from './video-footer-utils';
import { useCurrentAudioLevel } from '../hooks/useCurrentAudioLevel';
const { Button: DropdownButton } = Dropdown;
interface MicrophoneButtonProps {
  isStartedAudio: boolean;
  isMuted: boolean;
  isSupportPhone?: boolean;
  isMicrophoneForbidden?: boolean;
  disabled?: boolean;
  audio?: string;
  phoneCountryList?: any[];
  onMicrophoneClick: () => void;
  onMicrophoneMenuClick: (key: string) => void;
  onPhoneCallClick?: (code: string, phoneNumber: string, name: string, option: any) => void;
  onPhoneCallCancel?: (code: string, phoneNumber: string, option: any) => Promise<any>;
  className?: string;
  microphoneList?: MediaDevice[];
  speakerList?: MediaDevice[];
  activeMicrophone?: string;
  activeSpeaker?: string;
  phoneCallStatus?: { text: string; type: string };
}
const MicrophoneButton = (props: MicrophoneButtonProps) => {
  const {
    isStartedAudio,
    isSupportPhone,
    isMuted,
    audio,
    className,
    microphoneList,
    speakerList,
    phoneCountryList,
    activeMicrophone,
    activeSpeaker,
    phoneCallStatus,
    disabled,
    isMicrophoneForbidden,
    onMicrophoneClick,
    onMicrophoneMenuClick,
    onPhoneCallClick,
    onPhoneCallCancel
  } = props;
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const level = useCurrentAudioLevel();
  const tooltipText = isStartedAudio ? (isMuted ? 'unmute' : 'mute') : 'start audio';
  const menuItems = [];
  if (microphoneList?.length && audio !== 'phone') {
    menuItems.push(
      getAntdItem(
        'Select a Microphone',
        'microphone',
        undefined,
        microphoneList.map((i) =>
          getAntdItem(i.label, `microphone|${i.deviceId}`, activeMicrophone === i.deviceId && <CheckOutlined />)
        ),
        'group'
      )
    );
    menuItems.push(getAntdItem('', 'd1', undefined, undefined, 'divider'));
  }
  if (speakerList?.length && audio !== 'phone') {
    menuItems.push(
      getAntdItem(
        'Select a speaker',
        'speaker',
        undefined,
        speakerList.map((i) =>
          getAntdItem(i.label, `speaker|${i.deviceId}`, activeSpeaker === i.deviceId && <CheckOutlined />)
        ),
        'group'
      )
    );
    menuItems.push(getAntdItem('', 'd2', undefined, undefined, 'divider'));
  }
  if (audio !== 'phone') {
    menuItems.push(getAntdItem('Audio Statistic', 'statistic'));
  }
  menuItems.push(getAntdItem(audio === 'phone' ? 'Hang Up' : 'Leave Audio', 'leave audio'));

  const onMenuItemClick = (payload: { key: any }) => {
    onMicrophoneMenuClick(payload.key);
  };
  const onPhoneMenuClick = (payload: { key: any }) => {
    if (payload.key === 'phone') {
      setIsPhoneModalOpen(true);
    }
  };
  const audioIcon = useMemo(() => {
    let iconType = '';
    if (isStartedAudio) {
      if (isMuted) {
        if (audio === 'phone') {
          iconType = 'icon-phone-off';
        } else {
          return <AudioMutedOutlined />;
        }
      } else {
        if (audio === 'phone') {
          iconType = 'icon-phone';
        } else {
          if (level !== 0) {
            iconType = 'icon-audio-animation';
          } else {
            return <AudioOutlined />;
          }
        }
      }
    } else {
      if (isMicrophoneForbidden) {
        iconType = 'icon-audio-warning';
      } else {
        iconType = 'icon-headset';
      }
    }
    if (iconType) {
      return <IconFont type={iconType} />;
    }
  }, [level, audio, isMuted, isMicrophoneForbidden, isStartedAudio]);
  useEffect(() => {
    if (isStartedAudio) {
      setIsPhoneModalOpen(false);
    }
  }, [isStartedAudio]);
  return (
    <div className={classNames('microphone-footer', className)}>
      {isStartedAudio ? (
        <DropdownButton
          className="vc-dropdown-button"
          size="large"
          menu={getAntdDropdownMenu(menuItems, onMenuItemClick)}
          onClick={onMicrophoneClick}
          trigger={['click']}
          type="ghost"
          icon={<UpOutlined />}
          placement="topRight"
          disabled={disabled}
        >
          {audioIcon}
        </DropdownButton>
      ) : (
        <Tooltip title={tooltipText}>
          {isSupportPhone ? (
            <DropdownButton
              className="vc-dropdown-button"
              size="large"
              menu={getAntdDropdownMenu([getAntdItem('Invite by phone', 'phone')], onPhoneMenuClick)}
              onClick={onMicrophoneClick}
              trigger={['click']}
              type="ghost"
              icon={<UpOutlined />}
              placement="topRight"
            >
              {audioIcon}
            </DropdownButton>
          ) : (
            <Button
              className="vc-button"
              icon={audioIcon}
              size="large"
              ghost
              shape="circle"
              onClick={onMicrophoneClick}
            />
          )}
        </Tooltip>
      )}
      <CallOutModal
        visible={isPhoneModalOpen}
        setVisible={(visible: boolean) => setIsPhoneModalOpen(visible)}
        phoneCallStatus={phoneCallStatus}
        phoneCountryList={phoneCountryList}
        onPhoneCallCancel={onPhoneCallCancel}
        onPhoneCallClick={onPhoneCallClick}
      />
    </div>
  );
};

export default MicrophoneButton;
