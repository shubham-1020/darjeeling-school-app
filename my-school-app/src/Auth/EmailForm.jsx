import React, { useState, useEffect, useCallback } from 'react'; // Import useCallback
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../setup';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail,
    onAuthStateChanged,
    reload,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'; 
// React Icons for visual appeal
import {
    IoMailOutline,
    IoLockClosedOutline,
    IoPersonOutline,
    IoCalendarOutline,
    IoCheckmarkCircleOutline,
    IoAlertCircleOutline,
    IoInformationCircleOutline,
    IoArrowBack,
    IoRocketOutline, // For register/go
    IoLogInOutline, // For login
    IoSyncOutline, // For resend
} from 'react-icons/io5';
import { FaSpinner } from 'react-icons/fa'; // For loading spinner

export default function EmailForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [dob, setDob] = useState('');
    const [userRole, setUserRole] = useState(localStorage.getItem('role') || 'parent'); // Default to 'parent' if not set, remove 'admin' default as it implies a role assignment
    const [isRegister, setIsRegister] = useState(false);

    // Feedback/Message states
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState(''); // 'success', 'error', 'warning', 'info'
    const [loading, setLoading] = useState(false);

    const [emailSentForVerification, setEmailSentForVerification] = useState(false);
    const [profileNeedsCompletion, setProfileNeedsCompletion] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);

    const navigate = useNavigate();

    // Helper for showing messages
    const showFeedbackMessage = useCallback((msg, type) => {
        setMessage(msg);
        setMessageType(type);
        // Clear message after a few seconds unless it's a persistent prompt
        if (type !== 'persistent-info' && type !== 'persistent-error') {
            setTimeout(() => {
                setMessage('');
                setMessageType('');
            }, 5000);
        }
    }, []);

    //reseting the form
    const resetFormStates = () => {
        setEmail('');
        setPassword('');
        setName('');
        setDob('');
        setMessage('');
        setMessageType('');
        setEmailSentForVerification(false);
        setShowForgotPassword(false);
        setProfileNeedsCompletion(false);
        setLoading(false);
    };

    //role selection
    const handleRoleSelection = (role) => {
        localStorage.setItem('role', role);
        setUserRole(role);
        setIsRegister(false);
        resetFormStates();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setMessageType('');

        //not allowing empty email and password
        if (!email || !password) {
            showFeedbackMessage('Please fill email & password.', 'error');
            setLoading(false);
            return;
        }

        try {
            if (isRegister) {
                if (!emailSentForVerification) {
                    const { user } = await createUserWithEmailAndPassword(auth, email, password); //creating the new user
                    await sendEmailVerification(user); //sending verification email
                    setEmailSentForVerification(true);
                    showFeedbackMessage('Verification email sent! Check your inbox, then click "Proceed".', 'success');
                }
                // If emailSentForVerification is true, and user clicks submit again (shouldn't happen with UI),
                // or if it's a retry logic, we just show the message without re-sending.
            } else { // Login flow
                const { user } = await signInWithEmailAndPassword(auth, email, password);
                await reload(user); // Ensure we have the latest user data

                // Check if the user is verified
                if (!user.emailVerified) {
                    setIsRegister(false); // Make sure we're not in register flow for this message
                    setEmailSentForVerification(true); // Show verification prompt
                    showFeedbackMessage('⚠️ Your email isn’t verified yet. Please check your inbox and click "Proceed".', 'warning');
                    setLoading(false); // Keep loading state false, as we are now waiting for user action
                    return;
                }

                // Determine collection based on the selected userRole
                const collectionName = userRole === 'teacher' ? 'teachers' : userRole === 'admin' ? 'admins' : 'parents';
                const docRef = doc(db, collectionName, user.uid);
                const docSnap = await getDoc(docRef);

                // Check if the profile exists in Firestore i.e in teachers or parents collection
                if (docSnap.exists()) {
                    console.log("Profile exists, navigating to dashboard.");
                    showFeedbackMessage('Login successful! Redirecting...', 'success');
                    setTimeout(() => navigate(userRole === 'teacher' ? '/teacher-dashboard' : userRole === 'admin' ? '/admin-dashboard' : '/parent-dashboard'), 1000);
                } else {
                    // Profile does not exist, prompt user to complete it
                    console.log("Profile does not exist, prompting for completion.");
                    setProfileNeedsCompletion(true);
                    showFeedbackMessage(`✅ Email verified! Complete your ${userRole} info below.`, 'persistent-info');
                }
            }

        } catch (err) {
            console.error('Auth error:', err.code, err.message, err.customData);
            let userMessage = 'An unexpected error occurred.';
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                userMessage = 'Invalid email or password.';
            } else if (err.code === 'auth/email-already-in-use') {
                userMessage = 'This email is already in use. Try logging in.';
                setIsRegister(false); // Suggest login instead
            } else if (err.code === 'auth/too-many-requests') {
                userMessage = 'Too many login attempts. Please try again later.';
            } else if (err.code === 'auth/invalid-email') {
                userMessage = 'Invalid email address.';
            }
            showFeedbackMessage(`Error: ${userMessage}`, 'error');
        } finally {
            if (!emailSentForVerification && !profileNeedsCompletion) { // Don't set loading to false if we transitioned to a new state requiring user input
                setLoading(false);
            }
        }
    };

    const handleProceed = async () => {
        setLoading(true);
        setMessage('');
        setMessageType('');

        const user = auth.currentUser;
        if (!user) {
            showFeedbackMessage('Session expired—please login again.', 'error');
            setLoading(false);
            navigate('/');
            return;
        }
        try {
            await reload(user); // Crucial to get the latest emailVerified status

            if (user.emailVerified) {
                // Determine collection based on the selected userRole
                const collectionName = userRole === 'teacher' ? 'teachers' : userRole === 'admin' ? 'admins' : 'parents';
                const docRef = doc(db, collectionName, user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    showFeedbackMessage('Email verified and profile found. Redirecting...', 'success');
                    setTimeout(() => navigate(userRole === 'teacher' ? '/teacher-dashboard' : userRole === 'parent' ? '/parent-dashboard' : '/admin-dashboard'), 1000);
                } else {
                    setProfileNeedsCompletion(true);
                    showFeedbackMessage(`Email verified! Complete your ${userRole} info below.`, 'persistent-info');
                }
            } else {
                showFeedbackMessage('⚠️ Email still not verified. Please check your inbox.', 'warning');
            }
        } catch (err) {
            console.error("Error proceeding:", err);
            showFeedbackMessage('Failed to check verification status. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setMessageType('');

        const user = auth.currentUser;
        // Ensure user is loaded and email is verified before proceeding
        if (!user || !user.emailVerified) {
            showFeedbackMessage('⚠️ Email not verified or session expired. Please verify your email or log in again.', 'error');
            setLoading(false);
            return;
        }

        if (!name.trim() || !dob) {
            showFeedbackMessage('Please provide your full name and date of birth.', 'error');
            setLoading(false);
            return;
        }

        try {
            // Corrected logic for determining collection name
            let collectionName;
            if (userRole === 'teacher') {
                collectionName = 'teachers';
            } else if (userRole === 'admin') {
                collectionName = 'admins';
            } else {
                collectionName = 'parents';
            }

            await setDoc(
                doc(
                    db,
                    collectionName, // Use the correctly determined collection name
                    user.uid
                ),
                {
                    name: name.trim(),
                    dob,
                    email: user.email,
                    uid: user.uid,
                    createdAt: serverTimestamp(),
                },
                {
                    merge: true
                });

            showFeedbackMessage('Profile saved successfully! Redirecting...', 'success');
            setTimeout(() => navigate(userRole === 'teacher' ? '/teacher-dashboard' : userRole === 'parent' ? '/parent-dashboard' : '/admin-dashboard'), 1000);

        } catch (err) {
            console.error("Firestore write error:", err);
            showFeedbackMessage(`Failed to save profile: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleResendVerification = async () => {
        setLoading(true);
        setMessage('');
        setMessageType('');

        const user = auth.currentUser;
        if (!user) {
            showFeedbackMessage('Session expired—please login again.', 'error');
            setLoading(false);
            navigate('/');
            return;
        }
        try {
            await sendEmailVerification(user);
            showFeedbackMessage('Verification email resent! Check your inbox.', 'success');
        } catch (err) {
            console.error("Error resending verification:", err);
            showFeedbackMessage('Error resending verification.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        setLoading(true);
        setMessage('');
        setMessageType('');

        if (!email.trim()) {
            showFeedbackMessage('Please enter your email address to reset password.', 'warning');
            setLoading(false);
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email.trim());
            showFeedbackMessage('Password reset link sent to your email!', 'success');
            setShowForgotPassword(false); // Redirect to login form after sending link
            setEmail(''); // Clear email field after sending
        } catch (err) {
            console.error("Forgot password error:", err);
            let userMessage = 'Failed to send reset link.';
            if (err.code === 'auth/user-not-found') {
                userMessage = 'No user found with that email address.';
            } else if (err.code === 'auth/invalid-email') {
                userMessage = 'Please enter a valid email address.';
            }
            showFeedbackMessage(`Error: ${userMessage}`, 'error');
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (user) {
                await reload(user);

                // If user is already verified and has a profile, navigate directly
                if (user.emailVerified) {
                    // Check all possible roles for existing profile
                    const teacherDocRef = doc(db, 'teachers', user.uid);
                    const teacherDocSnap = await getDoc(teacherDocRef);
                    if (teacherDocSnap.exists()) {
                        navigate('/teacher-dashboard');
                        return;
                    }

                    const parentDocRef = doc(db, 'parents', user.uid);
                    const parentDocSnap = await getDoc(parentDocRef);
                    if (parentDocSnap.exists()) {
                        navigate('/parent-dashboard');
                        return;
                    }

                    const adminDocRef = doc(db, 'admins', user.uid);
                    const adminDocSnap = await getDoc(adminDocRef);
                    if (adminDocSnap.exists()) {
                        navigate('/admin-dashboard');
                        return;
                    }

                    // If verified but no profile yet, prompt for profile completion
                    setProfileNeedsCompletion(true);
                    // Only set message if not already set by a previous action
                    if (!message) {
                        showFeedbackMessage(`Email verified! Complete your ${userRole} info below.`, 'persistent-info');
                    }
                }
                // If user exists but not verified, show verification prompt
                else {
                    setEmailSentForVerification(true); // Treat as if verification email was just sent to prompt action
                    // Only set message if not already set by a previous action
                    if (!message) {
                        showFeedbackMessage('Your email isn’t verified yet. Check your inbox and click "Proceed".', 'warning');
                    }
                }
            } else {
                // If user logs out or no user, ensure states are reset for login/register form
                resetFormStates();
            }
        });

        return unsub;
    }, [navigate, userRole, message, showFeedbackMessage]); // Added showFeedbackMessage to dependencies

    const messageStyles = {
        success: 'bg-green-100 border-green-400 text-green-700',
        error: 'bg-red-100 border-red-400 text-red-700',
        warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
        info: 'bg-blue-100 border-blue-400 text-blue-700',
        'persistent-info': 'bg-blue-100 border-blue-400 text-blue-700',
        'persistent-error': 'bg-red-100 border-red-400 text-red-700',
    };

    const messageIcons = {
        success: <IoCheckmarkCircleOutline className="mr-2 text-lg" />,
        error: <IoAlertCircleOutline className="mr-2 text-lg" />,
        warning: <IoAlertCircleOutline className="mr-2 text-lg" />,
        info: <IoInformationCircleOutline className="mr-2 text-lg" />,
        'persistent-info': <IoInformationCircleOutline className="mr-2 text-lg" />,
        'persistent-error': <IoAlertCircleOutline className="mr-2 text-lg" />,
    };

    // Component to render the main form (login/register/forgot password)
    const renderMainForm = () => {
        if (isRegister) {
            if (emailSentForVerification) {
                return (
                    <div className="text-center p-4">
                        <p className="mb-4 text-green-700 text-lg">
                            <strong className="block mb-2">Almost there!</strong>
                            A verification email has been sent to <b className="text-blue-700">{email}</b>.
                            Please check your inbox (and spam folder!) to verify your email.
                        </p>
                        <button
                            type="button"
                            onClick={handleProceed}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed mb-3"
                            disabled={loading}
                        >
                            {loading ? <FaSpinner className="animate-spin" /> : <IoRocketOutline />}
                            {loading ? 'Processing...' : 'I have verified my email — Proceed'}
                        </button>
                        <button
                            type="button"
                            onClick={handleResendVerification}
                            className="text-sm text-blue-600 underline hover:text-blue-800 transition-colors duration-200 block text-center mb-4"
                            disabled={loading}
                        >
                            Resend verification email
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setIsRegister(false);
                                resetFormStates();
                            }}
                            className="text-sm text-gray-600 underline hover:text-gray-800 transition-colors duration-200 flex items-center justify-center gap-1"
                            disabled={loading}
                        >
                            <IoArrowBack /> Back to Login
                        </button>
                    </div>
                );
            } else {
                return (
                    <form onSubmit={handleSubmit} className="space-y-4 p-4">
                        <div className="relative">
                            <IoMailOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                required
                                aria-label="Email"
                            />
                        </div>
                        <div className="relative">
                            <IoLockClosedOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                required
                                aria-label="Password"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                        >
                            {loading ? <FaSpinner className="animate-spin" /> : <IoRocketOutline />}
                            {loading ? 'Registering...' : 'Register'}
                        </button>
                    </form>
                );
            }
        } else if (showForgotPassword) {
            return (
                <div className="space-y-4 p-4">
                    <p className="text-gray-600 text-center text-sm">Enter your email to receive a password reset link.</p>
                    <div className="relative">
                        <IoMailOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            required
                            aria-label="Email"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading}
                    >
                        {loading ? <FaSpinner className="animate-spin" /> : <IoMailOutline />}
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setShowForgotPassword(false);
                            resetFormStates();
                        }}
                        className="mt-2 text-sm text-gray-600 underline hover:text-gray-800 transition-colors duration-200 block text-center"
                        disabled={loading}
                    >
                        Back to Login
                    </button>
                </div>
            );
        } else { // Login form
            return (
                <form onSubmit={handleSubmit} className="space-y-4 p-4">
                    <div className="relative">
                        <IoMailOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            required
                            aria-label="Email"
                        />
                    </div>
                    <div className="relative">
                        <IoLockClosedOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            required
                            aria-label="Password"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading}
                    >
                        {loading ? <FaSpinner className="animate-spin" /> : <IoLogInOutline />}
                        {loading ? 'Logging In...' : 'Login'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setShowForgotPassword(true);
                            setMessage('');
                            setMessageType('');
                        }}
                        className="mt-2 text-sm text-blue-600 underline hover:text-blue-800 transition-colors duration-200 block text-center"
                        disabled={loading}
                    >
                        Forgot Password?
                    </button>
                </form>
            );
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh] p-4 relative overflow-hidden">
            <div className="w-full max-w-md p-8 md:p-10 rounded-[2.5rem] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl relative z-10">
                <div className="text-center mb-10">
                    <h2 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
                        {isRegister
                            ? emailSentForVerification ? 'Verify Identity' : 'Join Us'
                            : showForgotPassword
                                ? 'Reset Access'
                                : 'Welcome Back'}
                    </h2>
                    <p className="text-foreground/40 text-sm font-medium uppercase tracking-widest">
                        Access as <span className="text-primary">{userRole}</span>
                    </p>
                </div>

                <div className="flex p-1.5 gap-2 mb-8 bg-white/5 rounded-2xl border border-white/5">
                    {['teacher', 'parent', 'admin'].map((r) => (
                        <button
                            key={r}
                            onClick={() => handleRoleSelection(r)}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 uppercase tracking-wider
                                ${userRole === r 
                                    ? 'bg-primary text-black shadow-[0_0_20px_rgba(139,92,246,0.3)]' 
                                    : 'text-foreground/40 hover:text-foreground/60 hover:bg-white/5'
                                }`}
                        >
                            {r}
                        </button>
                    ))}
                </div>

                {message && (
                    <div className={`flex items-center p-4 rounded-2xl border mb-8 text-xs font-semibold backdrop-blur-xl ${messageStyles[messageType]}`} role="alert">
                        {messageIcons[messageType]}
                        <span>{message}</span>
                    </div>
                )}

                <div className="relative">
                    {profileNeedsCompletion ? (
                        <form onSubmit={handleCompleteProfile} className="space-y-6">
                             <div className="relative group">
                                <IoPersonOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/20 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all placeholder:text-foreground/20"
                                    required
                                />
                            </div>
                            <div className="relative group">
                                <IoCalendarOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/20 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="date"
                                    value={dob}
                                    onChange={(e) => setDob(e.target.value)}
                                    className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all placeholder:text-foreground/20"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-4 rounded-2xl bg-primary text-black font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 group shadow-[0_0_30px_rgba(139,92,246,0.2)]"
                                disabled={loading}
                            >
                                {loading ? <FaSpinner className="animate-spin" /> : <IoCheckmarkCircleOutline className="text-lg" />}
                                <span>Save & Continue</span>
                            </button>
                        </form>
                    ) : renderMainForm()}
                </div>

                {!emailSentForVerification && (
                    <p className="mt-10 text-center text-xs font-medium text-foreground/30 uppercase tracking-widest">
                        {isRegister ? 'Joined before?' : "New here?"}{' '}
                        <button
                            type="button"
                            onClick={() => {
                                setIsRegister(!isRegister);
                                resetFormStates();
                            }}
                            className="text-primary hover:text-primary/80 transition-colors underline underline-offset-4 font-bold"
                            disabled={loading}
                        >
                            {isRegister ? 'Sign In' : 'Create Account'}
                        </button>
                    </p>
                )}

            </div>
            
            {/* Decorative element */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-radial-vignette pointer-events-none -z-10" />
        </div>
    );
}