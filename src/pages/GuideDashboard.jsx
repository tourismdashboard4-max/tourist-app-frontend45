// client/src/pages/GuideDashboard.jsx
// نسخة تعتمد كلياً على localStorage – لا تستخدم API الخادم
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, Package, CheckCircle, XCircle, Edit2, Trash2,
  Users, DollarSign, Clock, MapPin, Eye, EyeOff,
  ArrowLeft, Shield, RefreshCw, Search,
  Map, Image, Camera
} from 'lucide-react';
import toast from 'react-hot-toast';

const GuideDashboard = ({ lang, guide, setPage, user, setUserPrograms, onProgramAdded }) => {
  const [programs, setPrograms] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddProgram, setShowAddProgram] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef(null);
  const editImageInputRef = useRef(null);
  
  const [stats, setStats] = useState({
    totalParticipants: 0,
    totalRevenue: 0,
    pendingRequests: 0,
    activePrograms: 0
  });
  
  const [newProgram, setNewProgram] = useState({
    name: "",
    description: "",
    location: "",
    price: "",
    duration: "",
    maxParticipants: "",
    location_lat: "",
    location_lng: "",
    image: null,
    imagePreview: null
  });

  // ✅ التحقق من أن المستخدم مرشد
  const isGuide = user?.role === 'guide' || 
                  user?.type === 'guide' || 
                  user?.isGuide === true || 
                  user?.guide_status === 'approved';

  // ✅ تحديث الخريطة بالبرامج النشطة وحفظها في localStorage العام
  const updateMapWithPrograms = useCallback((programsList) => {
    if (!programsList) return;
    
    const activePrograms = programsList.filter(p => p.status === 'active');
    const mapPrograms = activePrograms.map(p => ({
      id: p.id,
      name_ar: p.name,
      name_en: p.name,
      guide_name: p.guide_name || user?.fullName || guide?.name || "مرشد سياحي",
      guide_id: p.guide_id || user?.id || guide?.id,
      coords: p.coords || (p.location_lng && p.location_lat ? [parseFloat(p.location_lng), parseFloat(p.location_lat)] : null),
      price: p.price,
      duration: p.duration,
      rating: p.rating || 4.5,
      distance: p.distance || null,
      active: true,
      location_name: p.location_name || p.location,
      description: p.description,
      maxParticipants: p.maxParticipants,
      currentParticipants: p.participants || 0,
      participants: p.participants || 0,
      created_at: p.created_at,
      image: p.image || null
    })).filter(p => p.coords !== null);
    
    if (setUserPrograms) {
      setUserPrograms(mapPrograms);
      console.log('🗺️ Updated map with programs:', mapPrograms.length);
    }
    
    localStorage.setItem('public_programs', JSON.stringify(mapPrograms));
    console.log('💾 Saved to public storage:', mapPrograms.length);
  }, [setUserPrograms, user?.fullName, guide?.name, user?.id, guide?.id]);

  // ✅ حفظ البرامج في localStorage الخاص بالمرشد (باستخدام الرقم)
  const saveProgramsToLocal = useCallback((programsList) => {
    const numericId = user?.id || guide?.id;
    if (numericId) {
      localStorage.setItem(`guide_programs_${numericId}`, JSON.stringify(programsList));
      console.log('💾 Saved', programsList.length, 'programs to guide storage');
    }
    updateMapWithPrograms(programsList);
  }, [user?.id, guide?.id, updateMapWithPrograms]);

  // ✅ رفع الصورة وتحويلها إلى Base64
  const uploadProgramImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('الرجاء اختيار ملف صورة صالح');
      return;
    }
    setUploadingImage(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewProgram(prev => ({ ...prev, image: file, imagePreview: reader.result }));
      setUploadingImage(false);
      toast.success('تم تحميل الصورة بنجاح');
    };
    reader.onerror = () => {
      setUploadingImage(false);
      toast.error('فشل تحميل الصورة');
    };
    reader.readAsDataURL(file);
  };

  const handleEditImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('الرجاء اختيار ملف صورة صالح');
      return;
    }
    setUploadingImage(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditingProgram(prev => ({ ...prev, image: file, imagePreview: reader.result }));
      setNewProgram(prev => ({ ...prev, image: file, imagePreview: reader.result }));
      setUploadingImage(false);
      toast.success('تم تحديث الصورة');
    };
    reader.onerror = () => {
      setUploadingImage(false);
      toast.error('فشل تحميل الصورة');
    };
    reader.readAsDataURL(file);
  };

  // ✅ الحصول على إحداثيات الموقع باستخدام Mapbox
  const getCoordinatesFromLocation = async (locationName) => {
    if (!locationName) return null;
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationName)}.json?access_token=pk.eyJ1IjoibW9vaG1kMTUiLCJhIjoiY21obWJwN3EwMHF1czJvc2lyaWRyem0xciJ9.sl39WFOhm4m-kOOYtGqONw&limit=1`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        return { lat, lng, coords: [lng, lat], place_name: data.features[0].place_name };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    return null;
  };

  // ✅ تحميل البرامج من localStorage عند بدء التشغيل (بدون API)
  const loadInitialPrograms = useCallback(async () => {
    const numericId = user?.id || guide?.id;
    if (!numericId) return;
    
    // تحميل من localStorage الخاص بالمرشد
    const saved = localStorage.getItem(`guide_programs_${numericId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          setPrograms(parsed);
          updateMapWithPrograms(parsed);
          const activeProgs = parsed.filter(p => p.status === 'active');
          setStats({
            totalParticipants: activeProgs.reduce((sum, p) => sum + (p.participants || 0), 0),
            totalRevenue: activeProgs.reduce((sum, p) => sum + (p.participants || 0) * (p.price || 0), 0),
            pendingRequests: requests.filter(r => r.status === 'pending').length,
            activePrograms: activeProgs.length
          });
          console.log('📦 Loaded', parsed.length, 'programs from localStorage');
          setLoading(false);
          return;
        }
      } catch(e) { console.error(e); }
    }
    
    // إذا لم يكن هناك برامج، استخدم بيانات تجريبية
    const demoPrograms = [
      {
        id: Date.now() + 1,
        name: "جولة تاريخية في الدرعية",
        description: "استكشاف أحياء الدرعية القديمة وقصر المصمك",
        price: 150,
        duration: "3 ساعات",
        maxParticipants: 20,
        location: "الدرعية، الرياض",
        location_name: "الدرعية، الرياض",
        location_lat: 24.733,
        location_lng: 46.733,
        coords: [46.733, 24.733],
        status: "active",
        participants: 0,
        guide_id: numericId,
        guide_name: user?.fullName || guide?.name || "مرشد سياحي",
        image: null,
        rating: 4.5,
        created_at: new Date().toISOString()
      },
      {
        id: Date.now() + 2,
        name: "جولة برج المملكة",
        description: "زيارة برج المملكة والتمتع بإطلالة الرياض",
        price: 100,
        duration: "ساعتين",
        maxParticipants: 15,
        location: "برج المملكة، الرياض",
        location_name: "برج المملكة، الرياض",
        location_lat: 24.713,
        location_lng: 46.683,
        coords: [46.683, 24.713],
        status: "active",
        participants: 0,
        guide_id: numericId,
        guide_name: user?.fullName || guide?.name || "مرشد سياحي",
        image: null,
        rating: 4.5,
        created_at: new Date().toISOString()
      }
    ];
    setPrograms(demoPrograms);
    saveProgramsToLocal(demoPrograms);
    updateMapWithPrograms(demoPrograms);
    const activeProgs = demoPrograms.filter(p => p.status === 'active');
    setStats({
      totalParticipants: activeProgs.reduce((sum, p) => sum + (p.participants || 0), 0),
      totalRevenue: activeProgs.reduce((sum, p) => sum + (p.participants || 0) * (p.price || 0), 0),
      pendingRequests: requests.filter(r => r.status === 'pending').length,
      activePrograms: activeProgs.length
    });
    console.log('📦 Loaded demo programs for guide');
    setLoading(false);
  }, [user?.id, guide?.id, updateMapWithPrograms, requests, saveProgramsToLocal]);

  useEffect(() => {
    loadInitialPrograms();
  }, [loadInitialPrograms]);

  // ✅ إضافة برنامج جديد (محلياً فقط)
  const handleAddProgram = async () => {
    if (!newProgram.name.trim()) {
      toast.error(lang === 'ar' ? 'الرجاء إدخال اسم البرنامج' : 'Please enter program name');
      return;
    }
    if (!newProgram.location.trim()) {
      toast.error(lang === 'ar' ? 'الرجاء إدخال موقع البرنامج' : 'Please enter program location');
      return;
    }
    
    setLoading(true);
    try {
      const numericId = user?.id || guide?.id;
      toast.loading('جاري تحديد موقع البرنامج...', { id: 'geocoding' });
      let locationData = await getCoordinatesFromLocation(newProgram.location);
      if (!locationData) {
        locationData = { lat: 24.7136, lng: 46.6753, coords: [46.6753, 24.7136], place_name: 'الرياض، المملكة العربية السعودية' };
        toast.warning('سيتم استخدام موقع افتراضي', { id: 'geocoding' });
      } else {
        toast.success('تم تحديد الموقع', { id: 'geocoding' });
      }
      
      let imageUrl = null;
      if (newProgram.image) {
        imageUrl = await uploadProgramImage(newProgram.image);
      }
      
      const newProgramObj = {
        id: Date.now(),
        name: newProgram.name,
        description: newProgram.description || "",
        price: parseFloat(newProgram.price) || 0,
        duration: newProgram.duration || "غير محدد",
        maxParticipants: parseInt(newProgram.maxParticipants) || 20,
        location: newProgram.location,
        location_name: locationData.place_name || newProgram.location,
        location_lat: locationData.lat,
        location_lng: locationData.lng,
        coords: locationData.coords,
        image: imageUrl,
        status: 'active',
        participants: 0,
        guide_id: numericId,
        guide_name: user?.fullName || guide?.name || "مرشد سياحي",
        rating: 4.5,
        created_at: new Date().toISOString()
      };
      
      const updatedPrograms = [...programs, newProgramObj];
      setPrograms(updatedPrograms);
      saveProgramsToLocal(updatedPrograms);
      
      const activeProgs = updatedPrograms.filter(p => p.status === 'active');
      setStats({
        totalParticipants: activeProgs.reduce((sum, p) => sum + (p.participants || 0), 0),
        totalRevenue: activeProgs.reduce((sum, p) => sum + (p.participants || 0) * (p.price || 0), 0),
        pendingRequests: stats.pendingRequests,
        activePrograms: activeProgs.length
      });
      
      setNewProgram({ name: "", description: "", location: "", price: "", duration: "", maxParticipants: "", location_lat: "", location_lng: "", image: null, imagePreview: null });
      setShowAddProgram(false);
      if (onProgramAdded) onProgramAdded();
      toast.success(lang === 'ar' ? '✅ تم إضافة البرنامج وسيظهر للجميع' : '✅ Program added');
    } catch (error) {
      console.error(error);
      toast.error(lang === 'ar' ? '❌ حدث خطأ' : 'Error');
    } finally {
      setLoading(false);
    }
  };

  // ✅ تحديث حالة البرنامج (تفعيل/إيقاف) – محلياً فقط
  const toggleProgramStatus = (programId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const updatedPrograms = programs.map(p => p.id === programId ? { ...p, status: newStatus } : p);
    setPrograms(updatedPrograms);
    saveProgramsToLocal(updatedPrograms);
    
    const activeProgs = updatedPrograms.filter(p => p.status === 'active');
    setStats(prev => ({
      ...prev,
      activePrograms: activeProgs.length,
      totalParticipants: activeProgs.reduce((sum, p) => sum + (p.participants || 0), 0),
      totalRevenue: activeProgs.reduce((sum, p) => sum + (p.participants || 0) * (p.price || 0), 0)
    }));
    
    if (onProgramAdded) onProgramAdded();
    toast.success(newStatus === 'active' 
      ? (lang === 'ar' ? '✅ تم التفعيل وسيظهر للجميع' : 'Activated')
      : (lang === 'ar' ? '⏸ تم الإيقاف ولن يظهر' : 'Deactivated'));
  };

  // ✅ حذف البرنامج – محلياً فقط
  const handleDeleteProgram = (programId) => {
    if (!confirm(lang === 'ar' ? '⚠️ هل أنت متأكد من الحذف؟' : 'Confirm delete?')) return;
    const updatedPrograms = programs.filter(p => p.id !== programId);
    setPrograms(updatedPrograms);
    saveProgramsToLocal(updatedPrograms);
    if (onProgramAdded) onProgramAdded();
    toast.success(lang === 'ar' ? '✅ تم الحذف' : 'Deleted');
  };

  // ✅ فتح نافذة التعديل
  const openEditModal = (program) => {
    setEditingProgram(program);
    setNewProgram({
      name: program.name || "",
      description: program.description || "",
      location: program.location_name || program.location || "",
      price: program.price || "",
      duration: program.duration || "",
      maxParticipants: program.maxParticipants || "",
      location_lat: program.location_lat || "",
      location_lng: program.location_lng || "",
      image: null,
      imagePreview: program.image || null
    });
    setShowEditModal(true);
  };

  // ✅ تحديث البرنامج – محلياً فقط
  const handleUpdateProgram = async () => {
    if (!editingProgram) return;
    setLoading(true);
    try {
      let imageUrl = editingProgram.image;
      if (newProgram.image && newProgram.image !== editingProgram.image) {
        imageUrl = await uploadProgramImage(newProgram.image);
      }
      
      let locationData = null;
      let locationLat = editingProgram.location_lat;
      let locationLng = editingProgram.location_lng;
      let locationName = newProgram.location;
      if (newProgram.location !== editingProgram.location_name) {
        locationData = await getCoordinatesFromLocation(newProgram.location);
        if (locationData) {
          locationLat = locationData.lat;
          locationLng = locationData.lng;
          locationName = locationData.place_name;
        }
      }
      
      const updatedPrograms = programs.map(p => 
        p.id === editingProgram.id 
          ? { 
              ...p, 
              name: newProgram.name,
              description: newProgram.description,
              price: parseFloat(newProgram.price),
              duration: newProgram.duration,
              maxParticipants: parseInt(newProgram.maxParticipants),
              location: newProgram.location,
              location_name: locationName,
              location_lat: locationLat,
              location_lng: locationLng,
              image: imageUrl,
              coords: locationData ? locationData.coords : p.coords
            }
          : p
      );
      setPrograms(updatedPrograms);
      saveProgramsToLocal(updatedPrograms);
      setShowEditModal(false);
      setEditingProgram(null);
      setNewProgram({ name: "", description: "", location: "", price: "", duration: "", maxParticipants: "", location_lat: "", location_lng: "", image: null, imagePreview: null });
      if (onProgramAdded) onProgramAdded();
      toast.success(lang === 'ar' ? '✅ تم التحديث' : 'Updated');
    } catch (error) {
      toast.error(lang === 'ar' ? '❌ فشل التحديث' : 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  // تصفية البرامج
  const filteredPrograms = programs.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // إذا لم يكن المستخدم مرشداً
  if (!isGuide) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 max-w-md">
          <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            {lang === 'ar' ? 'غير مصرح بالوصول' : 'Access Denied'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {lang === 'ar' ? 'هذه الصفحة مخصصة للمرشدين السياحيين فقط.' : 'This page is only for tour guides.'}
          </p>
          <button onClick={() => setPage('profile')} className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold">العودة للملف الشخصي</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      {/* زر العودة */}
      <div className="mb-4">
        <button onClick={() => setPage('home')} className="flex items-center gap-2 text-gray-600 hover:text-green-600">
          <ArrowLeft size={20} />
          <span>{lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}</span>
        </button>
      </div>

      {/* رأس الصفحة */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{lang === "ar" ? "لوحة تحكم المرشد" : "Guide Dashboard"}</h1>
            <p className="opacity-90 mt-1">{user?.fullName || guide?.name || "مرشد سياحي"}</p>
            <div className="flex items-center mt-2"><CheckCircle className="w-5 h-5 ml-1" /><span className="text-sm">حساب مرشد معتمد</span></div>
          </div>
          <div className="text-right"><div className="text-3xl font-bold">{stats.activePrograms}</div><div className="text-sm opacity-90">برنامج نشط</div></div>
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <Users className="w-6 h-6 text-blue-600 mb-2" />
          <div className="text-2xl font-bold">{stats.totalParticipants}</div>
          <div className="text-sm text-gray-600">مشاركين</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <DollarSign className="w-6 h-6 text-green-600 mb-2" />
          <div className="text-2xl font-bold">{stats.totalRevenue} ريال</div>
          <div className="text-sm text-gray-600">إجمالي الإيرادات</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <Clock className="w-6 h-6 text-yellow-600 mb-2" />
          <div className="text-2xl font-bold">{stats.pendingRequests}</div>
          <div className="text-sm text-gray-600">طلبات جديدة</div>
        </div>
      </div>

      {/* طلبات المشاركة (نموذجية) */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">طلبات المشاركة</h2>
        {requests.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center shadow-sm">
            <p className="text-gray-500">لا توجد طلبات حالياً</p>
          </div>
        ) : (
          <div className="space-y-3">{/* عرض الطلبات */}</div>
        )}
      </div>

      {/* برامج المرشد */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold">برامجي السياحية</h2>
            <p className="text-sm text-gray-500">📍 البرامج النشطة تظهر على الخريطة الرئيسية</p>
          </div>
          <button onClick={() => setShowAddProgram(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2">
            <Plus size={18} /> إضافة برنامج
          </button>
        </div>

        {/* بحث وتصفية */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="بحث..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pr-10 p-2 border rounded-lg dark:bg-gray-700" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="p-2 border rounded-lg dark:bg-gray-700">
            <option value="all">الكل</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
          </select>
        </div>

        {filteredPrograms.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border-2 border-dashed">
            <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-2">لا توجد برامج</p>
            <button onClick={() => setShowAddProgram(true)} className="px-6 py-2 bg-green-600 text-white rounded-lg">➕ أضف برنامجك الأول</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPrograms.map(p => (
              <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border">
                <div className="flex gap-3">
                  <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                    {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Package className="w-8 h-8 text-green-500" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold">{p.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs ${p.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {p.status === 'active' ? 'نشط' : 'غير نشط'}
                      </span>
                      {p.coords && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1"><MapPin size={12} /> على الخريطة</span>}
                    </div>
                    <p className="text-gray-600 text-sm line-clamp-2 mt-1">{p.description || "لا يوجد وصف"}</p>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                      <div><div className="text-gray-500 text-xs">السعر</div><div className="font-medium text-green-600">{p.price} ريال</div></div>
                      <div><div className="text-gray-500 text-xs">المدة</div><div>{p.duration}</div></div>
                      <div><div className="text-gray-500 text-xs">المشاركين</div><div>{p.participants || 0}/{p.maxParticipants || 20}</div></div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-2"><MapPin size={12} className="text-green-600" /> {p.location_name || p.location || "موقع غير محدد"}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => toggleProgramStatus(p.id, p.status)} className={`px-3 py-1 rounded-xl text-sm flex items-center gap-1 ${p.status === 'active' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {p.status === 'active' ? <EyeOff size={14} /> : <Eye size={14} />} {p.status === 'active' ? 'إيقاف' : 'تفعيل'}
                    </button>
                    <button onClick={() => openEditModal(p)} className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-xl text-sm flex items-center gap-1"><Edit2 size={14} /> تعديل</button>
                    <button onClick={() => handleDeleteProgram(p.id)} className="px-3 py-1 bg-red-100 text-red-700 rounded-xl text-sm flex items-center gap-1"><Trash2 size={14} /> حذف</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* نافذة إضافة برنامج */}
      {showAddProgram && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-green-600 p-5 rounded-t-2xl flex justify-between items-center">
              <h3 className="text-white font-bold text-xl">إضافة برنامج جديد</h3>
              <button onClick={() => setShowAddProgram(false)}><XCircle size={28} className="text-white/80" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div onClick={() => imageInputRef.current?.click()} className="relative w-full h-40 bg-gray-100 rounded-xl border-2 border-dashed cursor-pointer hover:border-green-500 overflow-hidden">
                {newProgram.imagePreview ? <img src={newProgram.imagePreview} className="w-full h-full object-cover" /> : <div className="flex flex-col items-center justify-center h-full"><Camera size={32} className="text-gray-400" /><p className="text-sm text-gray-500">اضغط لرفع صورة</p></div>}
                {uploadingImage && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-white"></div></div>}
              </div>
              <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              <input type="text" placeholder="اسم البرنامج *" value={newProgram.name} onChange={e => setNewProgram({...newProgram, name: e.target.value})} className="w-full p-3 border rounded-xl" />
              <textarea placeholder="الوصف" value={newProgram.description} onChange={e => setNewProgram({...newProgram, description: e.target.value})} className="w-full p-3 border rounded-xl" rows="3" />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="السعر" value={newProgram.price} onChange={e => setNewProgram({...newProgram, price: e.target.value})} className="p-3 border rounded-xl" />
                <input type="text" placeholder="المدة" value={newProgram.duration} onChange={e => setNewProgram({...newProgram, duration: e.target.value})} className="p-3 border rounded-xl" />
              </div>
              <input type="text" placeholder="الموقع *" value={newProgram.location} onChange={e => setNewProgram({...newProgram, location: e.target.value})} className="w-full p-3 border rounded-xl" />
              <input type="number" placeholder="العدد الأقصى" value={newProgram.maxParticipants} onChange={e => setNewProgram({...newProgram, maxParticipants: e.target.value})} className="w-full p-3 border rounded-xl" />
              <button onClick={handleAddProgram} disabled={loading} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold">➕ إضافة البرنامج ونشره</button>
              <button onClick={() => setShowAddProgram(false)} className="w-full py-3 border rounded-xl">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تعديل برنامج */}
      {showEditModal && editingProgram && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-yellow-600 p-5 rounded-t-2xl flex justify-between items-center">
              <h3 className="text-white font-bold text-xl">تعديل البرنامج</h3>
              <button onClick={() => { setShowEditModal(false); setEditingProgram(null); }}><XCircle size={28} className="text-white/80" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div onClick={() => editImageInputRef.current?.click()} className="relative w-full h-40 bg-gray-100 rounded-xl border-2 border-dashed cursor-pointer hover:border-yellow-500 overflow-hidden">
                {newProgram.imagePreview ? <img src={newProgram.imagePreview} className="w-full h-full object-cover" /> : (editingProgram.image ? <img src={editingProgram.image} className="w-full h-full object-cover" /> : <div className="flex flex-col items-center justify-center h-full"><Image size={32} className="text-gray-400" /><p className="text-sm text-gray-500">تغيير الصورة</p></div>)}
                {uploadingImage && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-white"></div></div>}
              </div>
              <input ref={editImageInputRef} type="file" accept="image/*" onChange={handleEditImageSelect} className="hidden" />
              <input type="text" placeholder="اسم البرنامج *" value={newProgram.name} onChange={e => setNewProgram({...newProgram, name: e.target.value})} className="w-full p-3 border rounded-xl" />
              <textarea placeholder="الوصف" value={newProgram.description} onChange={e => setNewProgram({...newProgram, description: e.target.value})} className="w-full p-3 border rounded-xl" rows="3" />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="السعر" value={newProgram.price} onChange={e => setNewProgram({...newProgram, price: e.target.value})} className="p-3 border rounded-xl" />
                <input type="text" placeholder="المدة" value={newProgram.duration} onChange={e => setNewProgram({...newProgram, duration: e.target.value})} className="p-3 border rounded-xl" />
              </div>
              <input type="text" placeholder="الموقع" value={newProgram.location} onChange={e => setNewProgram({...newProgram, location: e.target.value})} className="w-full p-3 border rounded-xl" />
              <input type="number" placeholder="العدد الأقصى" value={newProgram.maxParticipants} onChange={e => setNewProgram({...newProgram, maxParticipants: e.target.value})} className="w-full p-3 border rounded-xl" />
              <button onClick={handleUpdateProgram} disabled={loading} className="w-full py-3 bg-yellow-600 text-white rounded-xl font-bold">💾 حفظ التغييرات</button>
              <button onClick={() => { setShowEditModal(false); setEditingProgram(null); }} className="w-full py-3 border rounded-xl">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuideDashboard;