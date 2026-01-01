import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginByPhone, sendSms } from '@/services/auth';
import { useUserStore } from '@/store/useUserStore';
import { Loader2 } from 'lucide-react';
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
  const [isAgreed, setIsAgreed] = useState(false);
  const [showAgreementPopup, setShowAgreementPopup] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | 'sendCode'>(null);
  
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
  const sendCodeInternal = async () => {
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

  const handleSendCode = async () => {
    if (!isAgreed) {
      setPendingAction('sendCode');
      setShowAgreementPopup(true);
      return;
    }
    await sendCodeInternal();
  };

  const handleAgreementCancel = () => {
    setShowAgreementPopup(false);
    setPendingAction(null);
  };

  const handleAgreementConfirm = async () => {
    const action = pendingAction;
    setIsAgreed(true);
    setShowAgreementPopup(false);
    setPendingAction(null);

    if (action === 'sendCode') {
      await sendCodeInternal();
    }
  };

  const openUserAgreement = () => navigate('/legal/user-agreement');
  const openPrivacyPolicy = () => navigate('/legal/privacy-policy');

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
         <div className="flex items-center gap-3">
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
              className="block w-full px-4 py-3.5 rounded-xl border border-black bg-gray-50/50 text-center text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/5 focus:border-gray-900 focus:bg-white transition-all duration-300"
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
              className="block w-full px-4 py-3.5 rounded-xl border border-black bg-gray-50/50 text-center text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/5 focus:border-gray-900 focus:bg-white transition-all duration-300 flex-1"
              placeholder="请输入验证码"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button
                type="button"
                onClick={handleSendCode}
                disabled={countdown > 0}
                className="px-4 py-3.5 bg-white border border-black text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-w-[120px]"
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
      <div className="z-10 mt-8 flex flex-col items-center gap-3 text-xs text-gray-400 text-center tracking-wide px-6">
        <div className="flex items-start gap-2 text-gray-500">
          <input
            type="checkbox"
            checked={isAgreed}
            onChange={(e) => setIsAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
          />
          <div className="leading-5">
            <span>我已阅读并同意</span>{' '}
            <span
              className="text-blue-600 hover:text-blue-800 underline cursor-pointer transition-colors"
              onClick={openUserAgreement}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') openUserAgreement();
              }}
            >
              《用户协议》
            </span>{' '}
            <span>和</span>{' '}
            <span
              className="text-blue-600 hover:text-blue-800 underline cursor-pointer transition-colors"
              onClick={openPrivacyPolicy}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') openPrivacyPolicy();
              }}
            >
              《隐私政策》
            </span>
          </div>
        </div>
        <div>未注册用户登录后将自动注册账号</div>
      </div>

      {showAgreementPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="px-8 pt-8 pb-6 text-center">
              <div className="text-lg font-semibold text-gray-900">请阅读并同意以下条款</div>
              <div className="mt-4 text-sm text-gray-600">
                <span>我已阅读并同意</span>{' '}
                <span
                  className="text-blue-600 hover:text-blue-800 underline cursor-pointer transition-colors"
                  onClick={openUserAgreement}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') openUserAgreement();
                  }}
                >
                  《用户协议》
                </span>{' '}
                <span>和</span>{' '}
                <span
                  className="text-blue-600 hover:text-blue-800 underline cursor-pointer transition-colors"
                  onClick={openPrivacyPolicy}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') openPrivacyPolicy();
                  }}
                >
                  《隐私政策》
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 px-8 pb-8">
              <button
                type="button"
                onClick={handleAgreementCancel}
                className="h-11 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleAgreementConfirm}
                className="h-11 rounded-xl bg-[#48bcf6] text-white font-medium hover:bg-[#2fa8e6] transition-colors"
              >
                同意
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
