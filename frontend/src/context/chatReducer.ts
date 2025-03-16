import { Chat, Message } from "../types";

interface ChatState {
  chats: Chat[];
  messages: { [key: string]: Message[] };
  activeChat: Chat | null;
  error: string | null;
  typingStatus: { [key: string]: boolean };
}

type ChatAction =
  | { type: "SET_CHATS"; payload: Chat[] }
  | { type: "SET_ACTIVE_CHAT"; payload: Chat | null }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "ADD_MESSAGE"; payload: { chatId: string; message: Message } }
  | { type: "UPDATE_CHAT"; payload: Chat }
  | { type: "SET_TYPING"; payload: { chatId: string; isTyping: boolean } };

export const chatReducer = (
  state: ChatState,
  action: ChatAction
): ChatState => {
  switch (action.type) {
    case "SET_CHATS":
      return {
        ...state,
        chats: action.payload,
      };

    case "SET_ACTIVE_CHAT":
      return {
        ...state,
        activeChat: action.payload,
      };

    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
      };

    case "ADD_MESSAGE":
      const { chatId, message } = action.payload;
      return {
        ...state,
        messages: {
          ...state.messages,
          [chatId]: [
            ...(state.messages[chatId] || []).filter(
              (m) => m._id !== message._id
            ),
            message,
          ],
        },
      };

    case "UPDATE_CHAT":
      return {
        ...state,
        chats: state.chats.map((chat) =>
          chat._id === action.payload._id ? action.payload : chat
        ),
      };

    case "SET_TYPING":
      const { chatId: typingChatId, isTyping } = action.payload;
      return {
        ...state,
        typingStatus: {
          ...state.typingStatus,
          [typingChatId]: isTyping,
        },
      };

    default:
      return state;
  }
};
