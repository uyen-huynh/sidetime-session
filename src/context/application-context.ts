import React from 'react';

interface ApplicationContext {
  toast: any;
  onSessionClose: any;
  audioOnly: boolean;
  handleClickChatButton: any;
  openSessionChat: boolean;
}

export default React.createContext<ApplicationContext>(null as any);
