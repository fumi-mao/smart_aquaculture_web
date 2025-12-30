import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginByPhone, sendSms } from '@/services/auth';
import { useUserStore } from '@/store/useUserStore';
import { Loader2, Headphones } from 'lucide-react';
import ParticleBackground from '@/components/ParticleBackground';

/**
 * 登录页面组件
 * 
 * 功能描述：
 * 1. 提供手机号输入和验证码获取功能
 * 2. 处理用户登录逻辑，包括状态管理和错误处理
 * 3. 登录成功后跳转至首页，并存储用户信息
 */
const Login = () => {
  // 状态管理
  const [phone, setPhone] = useState(''); // 手机号
  const [code, setCode] = useState('');   // 验证码
  const [countdown, setCountdown] = useState(0); // 倒计时
  const [loading, setLoading] = useState(false); // 加载状态
  const [error, setError] = useState(''); // 错误信息
  
  const navigate = useNavigate();
  const { setToken, setUser } = useUserStore();

  // 倒计时效果处理
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // 验证手机号格式（中国大陆手机号）
  const isValidPhone = (p: string) => /^1[3-9]\d{9}$/.test(p);

  /**
   * 处理发送验证码逻辑
   * 1. 验证手机号格式
   * 2. 调用后端接口发送验证码
   * 3. 启动倒计时
   */
  const handleSendCode = async () => {
    setError('');
    // 基础非空验证
    if (!phone) {
      setError('请输入手机号');
      return;
    }
    // 格式验证
    if (!isValidPhone(phone)) {
      setError('请输入正确的手机号');
      return;
    }
    
    try {
      // 调用发送短信接口
      await sendSms(phone);
      setCountdown(60); // 设置60秒倒计时
    } catch (err: any) {
      console.error(err);
      setError(err.message || '发送验证码失败');
    }
  };

  /**
   * 处理登录逻辑
   * 1. 验证手机号和验证码
   * 2. 调用登录接口
   * 3. 成功后保存状态并跳转
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 表单验证
    if (!phone) {
        setError('请输入手机号');
        setLoading(false);
        return;
    }
    if (!isValidPhone(phone)) {
        setError('请输入正确的手机号');
        setLoading(false);
        return;
    }
    if (!code) {
        setError('请输入验证码');
        setLoading(false);
        return;
    }

    try {
      // 调用手机号登录接口
      const res = await loginByPhone(phone, code);
      if (res.data && res.data.token) {
        // 更新全局状态
        setToken(res.data.token);
        setUser({
          user_id: res.data.user_id,
          nickname: res.data.nickname,
          avatar_url: res.data.avatar_url,
        });
        // 跳转至首页
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
          {/* 手机号输入框 */}
          <div className="relative group">
            <input
              id="phone"
              name="phone"
              type="text"
              required
              className="block w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50/50 text-center text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/5 focus:border-gray-900 focus:bg-white transition-all duration-300"
              placeholder="请输入手机号"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {/* 验证码输入框与发送按钮 */}
          <div className="relative group flex gap-3">
             <input
              id="code"
              name="code"
              type="text"
              required
              className="block w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50/50 text-center text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/5 focus:border-gray-900 focus:bg-white transition-all duration-300 flex-1"
              placeholder="请输入验证码"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button
                type="button"
                onClick={handleSendCode}
                disabled={countdown > 0}
                className="px-4 py-3.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-w-[120px]"
            >
                {countdown > 0 ? `${countdown}s` : '发送验证码'}
            </button>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center font-medium animate-pulse">{error}</div>
          )}

          {/* 登录按钮 */}
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
