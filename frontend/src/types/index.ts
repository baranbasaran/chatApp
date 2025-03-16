export interface User {
  _id: string;
  username: string;
  email: string;
}

export interface Message {
  _id: string;
  content: string;
  sender: User;
  chat: string;
  createdAt: string;
  updatedAt: string;
}

export interface Chat {
  _id: string;
  users: User[];
  lastMessage?: Message;
  createdAt: string;
  updatedAt: string;
}
