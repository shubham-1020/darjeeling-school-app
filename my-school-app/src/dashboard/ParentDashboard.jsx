import { motion } from 'framer-motion';

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const parentDocRef = doc(db, 'parents', user.uid);
          const parentDocSnap = await getDoc(parentDocRef);

          if (parentDocSnap.exists()) {
            setUserName(parentDocSnap.data().name || user.email);
            setLoading(false);
          } else {
            const teacherDocRef = doc(db, 'teachers', user.uid);
            const teacherDocSnap = await getDoc(teacherDocRef);

            if (teacherDocSnap.exists()) {
              setError("Access Denied: You are registered as a teacher. Redirecting...");
              setTimeout(() => navigate('/teacher-dashboard'), 1500);
            } else {
              setError("Access Denied: Your profile is not found or incomplete.");
              await signOut(auth);
              navigate('/');
            }
          }
        } catch (err) {
          console.error("Error fetching parent data:", err);
          setError("Failed to fetch user data. Please try again.");
          await signOut(auth);
          navigate('/');
        }
      } else {
        navigate('/');
      }
    });

    return unsub;
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-foreground/40 text-sm font-bold uppercase tracking-widest animate-pulse">Syncing Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="p-8 rounded-3xl bg-red-500/5 border border-red-500/10 text-red-500 text-center max-w-md backdrop-blur-xl">
          <p className="text-lg font-bold mb-2">Error Encountered</p>
          <p className="text-sm opacity-60">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Welcome Hero */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative p-10 md:p-16 rounded-[3rem] bg-white/5 border border-white/10 overflow-hidden"
      >
        <div className="relative z-10">
          <span className="text-primary text-xs font-bold uppercase tracking-[0.3em] mb-4 block">Parent Portal</span>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            Welcome, <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{userName}</span>.
          </h1>
          <p className="text-foreground/40 text-lg max-w-xl">
            Stay connected with your child's academic journey at Vidya Deep Institute.
          </p>
        </div>
        <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/5 blur-[100px] -z-10" />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <section className="space-y-6">
          <div className="flex items-center gap-4 px-2">
            <h2 className="text-xl font-bold tracking-tight">Recent Notices</h2>
            <div className="h-px flex-grow bg-white/10" />
          </div>
          <div className="rounded-3xl p-6 bg-white/5 border border-white/10 backdrop-blur-xl">
            <DisplayNotice />
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-4 px-2">
            <h2 className="text-xl font-bold tracking-tight">Your Children</h2>
            <div className="h-px flex-grow bg-white/10" />
          </div>
          <div className="rounded-3xl p-6 bg-white/5 border border-white/10 backdrop-blur-xl">
            <StudentClasses/>
          </div>
        </section>
      </div>
    </div>
  );
}