import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { getImageUrl } from '../../utils';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(() => {
    return localStorage.getItem('chat_is_open') === 'true';
  });
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('chat_messages');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { role: 'assistant', content: 'Xin chào! Tôi là trợ lý ảo của CK TEA. Tôi có thể giúp gì cho bạn hôm nay?' }
    ];
  });
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState(localStorage.getItem('chat_session_token') || '');
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    localStorage.setItem('chat_is_open', isOpen);
  }, [isOpen]);

  useEffect(() => {
    localStorage.setItem('chat_messages', JSON.stringify(messages));
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = { role: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userMessage.content,
          session_token: sessionToken
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        if (data.session_token && data.session_token !== sessionToken) {
          setSessionToken(data.session_token);
          localStorage.setItem('chat_session_token', data.session_token);
        }
        
        // Cố gắng parse nội dung để xem có phải JSON không
        let finalContent = data.reply;
        try {
          const parsed = JSON.parse(data.reply);
          finalContent = parsed;
        } catch(e) {

        }

        setMessages(prev => [...prev, { role: 'assistant', content: finalContent }]);
      } else {
        toast.error('Có lỗi xảy ra khi gọi AI.');
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Xin lỗi, hệ thống AI đang gặp sự cố.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessageContent = (msg, index) => {
    if (typeof msg.content === 'string') {
      // Regular text message
      // Có thể dùng regex để thay thế \n thành <br/> để xuống dòng đẹp hơn
      return (
        <div 
          className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm shadow-sm ${
            msg.role === 'user' ? 'bg-primary text-white rounded-br-none ml-auto' : 'bg-gray-100 text-gray-800 rounded-bl-none leading-relaxed'
          }`}
          dangerouslySetInnerHTML={{__html: msg.content
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-600 underline font-bold" target="_blank">$1</a>')
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
            .replace(/^\* (.*?)$/gm, '&bull; $1')
            .replace(/\n/g, '<br/>')
          }}
        />
      );
    } else if (typeof msg.content === 'object' && msg.content.status === 'success' && msg.content.data) {
      // Nhận được dữ liệu JSON từ Tool
      return (
        <div className="w-full space-y-3 mt-2">
          {msg.content.data.map(product => (
            <div key={product.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex gap-3">
              <img src={getImageUrl(product.thumbnail)} alt={product.name} className="w-16 h-16 object-cover rounded-md" />
              <div className="flex-1">
                <h4 className="font-bold text-sm text-dark line-clamp-1">{product.name}</h4>
                <p className="text-primary font-semibold text-sm">{Number(product.price).toLocaleString()}₫</p>
                <div className="flex gap-2 mt-2">
                  <Link 
                    to={`/product/${product.id}`} 
                    className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition"
                  >
                    Xem chi tiết
                  </Link>
                  <button className="text-xs bg-primary text-white px-2 py-1 rounded hover:bg-primary-dark transition">
                    Thêm giỏ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Nút mở chat */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 hover:bg-primary-dark transition transform duration-200 cursor-pointer relative"
      >
        {isOpen ? (
          <i className="fas fa-times text-2xl"></i>
        ) : (
          <>
            <i className="fas fa-comment-dots text-2xl"></i>
            {/* Ping animation indicator */}
            <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
          </>
        )}
      </button>

      {/* Cửa sổ chat */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 sm:w-[360px] h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-fade-in origin-bottom-right">
          
          {/* Header */}
          <div className="bg-primary p-4 text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary relative">
                <i className="fas fa-robot text-xl"></i>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border border-white rounded-full"></span>
              </div>
              <div>
                <h3 className="font-bold text-sm">CK TEA Assistant</h3>
                <p className="text-xs text-primary-light flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block animate-pulse"></span>
                  Đang hoạt động
                </p>
              </div>
            </div>
            <button 
              onClick={() => {
                setMessages([{ role: 'assistant', content: 'Xin chào! Tôi là trợ lý ảo của CK TEA. Tôi có thể giúp gì cho bạn hôm nay?' }]);
                localStorage.removeItem('chat_messages');
                localStorage.removeItem('chat_session_token');
                setSessionToken('');
                toast.success('Đã làm mới cuộc trò chuyện!');
              }} 
              className="text-white hover:text-gray-200 transition p-2"
              title="Làm mới cuộc trò chuyện"
            >
              <i className="fas fa-sync-alt"></i>
            </button>
          </div>

          {/* Body (Messages) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-white mr-2 shrink-0">
                    <i className="fas fa-robot text-xs"></i>
                  </div>
                )}
                {renderMessageContent(msg, idx)}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-white mr-2 shrink-0">
                  <i className="fas fa-robot text-xs"></i>
                </div>
                <div className="bg-gray-100 text-gray-500 px-4 py-3 rounded-2xl rounded-bl-none flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer (Input) */}
          <div className="p-3 bg-white border-t border-gray-200">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2 relative">
              <input 
                type="text" 
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Hỏi tôi bất cứ điều gì..." 
                className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition pr-10"
              />
              <button 
                type="submit" 
                disabled={!inputMessage.trim() || isLoading}
                className="absolute right-2 text-primary hover:text-primary-dark disabled:text-gray-400 p-2 transition cursor-pointer"
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
