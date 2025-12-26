import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '@/services/auth';
import { useUserStore } from '@/store/useUserStore';
import { Loader2, Headphones, Bird } from 'lucide-react';
import ParticleBackground from '@/components/ParticleBackground';

const Login = () => {
  const [openid, setOpenid] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setToken, setUser } = useUserStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await login(openid);
      if (res.data && res.data.token) {
        setToken(res.data.token);
        setUser({
          user_id: res.data.user_id,
          nickname: res.data.nickname,
          avatar_url: res.data.avatar_url,
        });
        navigate('/');
      } else {
        setError('登录失败：无效的响应');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center bg-gradient-to-br from-[#f0f5f9] to-[#dbeafe] overflow-hidden font-sans">
      <ParticleBackground />

      {/* Logo & Brand */}
      <div className="z-10 flex flex-col items-center mb-6 animate-fade-in-down">
         <div className="flex items-center gap-3 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-white/60">
            <div className="p-1.5 bg-blue-500 rounded-lg text-white shadow-md">
                <img src="/favicon.svg" className="w-6 h-6" alt="logo" />
            </div>
            <img src="/tangqianyan-text.svg" alt="塘前燕" className="h-6 object-contain" />
         </div>
      </div>

      {/* Login Card */}
      <div className="z-10 w-full max-w-[420px] bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-10 border border-white">
        <h2 className="text-2xl font-extrabold text-center mb-8 text-gray-900 tracking-tight">
          欢迎回来
        </h2>
        
        <form className="space-y-6" onSubmit={handleLogin}>
          <div className="relative group">
            <input
              id="openid"
              name="openid"
              type="text"
              required
              className="block w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50/50 text-center text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/5 focus:border-gray-900 focus:bg-white transition-all duration-300"
              placeholder="请输入openid"
              value={openid}
              onChange={(e) => setOpenid(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center font-medium animate-pulse">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-[#2c2c2c] hover:bg-black text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 disabled:hover:translate-y-0 flex justify-center items-center"
          >
            {loading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              '登录'
            )}
          </button>
        </form>
      </div>
      
      {/* Footer Text */}
      <div className="z-10 mt-8 text-xs text-gray-400 text-center tracking-wide">
        登录即表示您已阅读并同意 <span className="text-gray-500 hover:text-gray-800 underline cursor-pointer transition-colors">用户协议</span> 和 <span className="text-gray-500 hover:text-gray-800 underline cursor-pointer transition-colors">隐私政策</span>
      </div>

      {/* Headset Icon */}
      <div className="absolute bottom-8 right-8 z-20 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 hover:shadow-xl transition-all duration-300 text-gray-600 hover:text-blue-600 border border-gray-100">
         <Headphones size={22} />
      </div>
    </div>
  );
};

export default Login;
