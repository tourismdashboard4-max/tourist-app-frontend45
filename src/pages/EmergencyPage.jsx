// ===================== 🗺️ Explore/Map Page =====================
function ExplorePage({ lang, mapContainerRef, setPage, transport, setTransport, user, programs, setPrograms, unreadCount, refreshTrigger }) {
  const t = (k) => LOCALES[lang][k] || k;
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [tripInfo, setTripInfo] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showMyProgramsOnly, setShowMyProgramsOnly] = useState(false);
  const [markers, setMarkers] = useState([]);

  // إذا كان المستخدم غير مسجل
  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 max-w-md">
          <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <MapPin className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            {lang === 'ar' ? 'الخريطة متاحة للأعضاء فقط' : 'Map Available for Members Only'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {lang === 'ar' 
              ? 'سجل دخول أو أنشئ حساب جديد للاستفادة من جميع ميزات التطبيق بما في ذلك الخريطة التفاعلية والبرامج القريبة'
              : 'Login or create a new account to access all app features including interactive maps and nearby programs'}
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={() => setPage('profile')} className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition">
              {lang === 'ar' ? 'تسجيل الدخول' : 'Login'}
            </button>
            <button onClick={() => setPage('home')} className="w-full py-3 border-2 border-green-600 text-green-600 rounded-xl font-medium hover:bg-green-50 transition">
              {lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // برامج من API أو localStorage
  const allPrograms = programs || [];
  
  // محاولة تحميل البرامج من localStorage إذا كانت programs فارغة
  useEffect(() => {
    if (allPrograms.length === 0) {
      const publicPrograms = localStorage.getItem('public_programs');
      if (publicPrograms) {
        try {
          const parsed = JSON.parse(publicPrograms);
          console.log('📦 Loaded public programs from localStorage:', parsed.length);
          if (setPrograms) {
            setPrograms(parsed);
          }
        } catch (e) {
          console.error('Error parsing public programs:', e);
        }
      }
    }
  }, [allPrograms.length, setPrograms]);

  const displayedPrograms = showMyProgramsOnly 
    ? allPrograms.filter(p => p.guide_id === user?.id)
    : allPrograms;
  
  const isGuide = user?.role === 'guide' || user?.type === 'guide' || user?.isGuide === true;

  // دالة لإضافة العلامات على الخريطة
  const addMarkersToMap = (map, programsList, userLoc, currentLang) => {
    // إزالة العلامات القديمة
    markers.forEach(marker => marker.remove());
    const newMarkers = [];

    console.log('🗺️ Adding markers for', programsList.length, 'programs');

    programsList.forEach((program) => {
      // التحقق من وجود إحداثيات
      let coords = null;
      
      if (program.coords && Array.isArray(program.coords) && program.coords.length === 2) {
        coords = program.coords;
      } else if (program.location_lng && program.location_lat) {
        coords = [parseFloat(program.location_lng), parseFloat(program.location_lat)];
      } else if (program.lng && program.lat) {
        coords = [parseFloat(program.lng), parseFloat(program.lat)];
      }
      
      if (coords && coords[0] && coords[1]) {
        const markerColor = program.guide_id === user?.id ? "#9b59b6" : "#3498db";
        
        const popupHTML = `
          <div style="text-align:${currentLang === "ar" ? "right" : "left"}; padding:12px; min-width:200px; direction:${currentLang === "ar" ? "rtl" : "ltr"}">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
              ${program.image ? `<img src="${program.image}" style="width:50px; height:50px; border-radius:10px; object-fit:cover;" />` : ''}
              <div>
                <strong style="font-size:16px;">${program.name_ar || program.name}</strong>
              </div>
            </div>
            <div style="font-size:12px; color:#666; margin-bottom:5px;">👤 ${program.guide_name || "مرشد سياحي"}</div>
            <div style="font-size:14px; color:#27ae60; font-weight:bold;">💰 ${program.price} ${currentLang === "ar" ? "ريال" : "SAR"}</div>
            <div style="font-size:12px; color:#888;">⏱️ ${program.duration || "غير محدد"}</div>
            <div style="font-size:12px; color:#f39c12;">⭐ ${program.rating || 4.5}</div>
            <button onclick="window.selectProgram(${program.id})" style="margin-top:10px; padding:5px 10px; background:#3498db; color:white; border:none; border-radius:5px; cursor:pointer;">
              ${currentLang === "ar" ? "عرض التفاصيل" : "View Details"}
            </button>
          </div>
        `;
        
        const marker = new mapboxgl.Marker({ color: markerColor })
          .setLngLat(coords)
          .setPopup(new mapboxgl.Popup({ maxWidth: '300px' }).setHTML(popupHTML))
          .addTo(map);
        
        // ربط حدث النقر على العلامة
        marker.getElement().addEventListener('click', () => {
          setSelectedProgram(program);
        });
        
        newMarkers.push(marker);
      } else {
        console.warn('⚠️ Program missing coordinates:', program.name, program);
      }
    });
    
    setMarkers(newMarkers);
    console.log('✅ Added', newMarkers.length, 'markers to map');
  };

  // دالة لإزالة الخريطة الحالية
  const cleanupMap = () => {
    if (mapInstance) {
      markers.forEach(marker => marker.remove());
      mapInstance.remove();
      setMapInstance(null);
      setMarkers([]);
    }
  };

  // ✅ تهيئة الخريطة
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    // تنظيف الخريطة السابقة
    cleanupMap();
    
    const initMapWithLocation = (center, zoom = 13) => {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/outdoors-v12",
        center: center,
        zoom: zoom
      });
      
      map.on('load', () => {
        setMapInstance(map);
        
        // إضافة علامة موقع المستخدم إذا وجد
        if (userLocation) {
          new mapboxgl.Marker({ color: "#2ecc71" })
            .setLngLat(userLocation)
            .setPopup(new mapboxgl.Popup().setText(lang === "ar" ? "📍 موقعك الحالي" : "📍 Your location"))
            .addTo(map);
        }
        
        // إضافة علامات البرامج
        if (displayedPrograms.length > 0) {
          addMarkersToMap(map, displayedPrograms, userLocation, lang);
        }
      });
      
      return map;
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const userCoords = [longitude, latitude];
          setUserLocation(userCoords);
          initMapWithLocation(userCoords);
        },
        (error) => {
          console.warn('Geolocation error:', error);
          const defaultCenter = [46.713, 24.774]; // الرياض
          initMapWithLocation(defaultCenter, 12);
        }
      );
    } else {
      const defaultCenter = [46.713, 24.774];
      initMapWithLocation(defaultCenter, 12);
    }
    
    return cleanupMap;
  }, [mapContainerRef]); // يتم التهيئة مرة واحدة فقط

  // تحديث الخريطة عند تغيير البرامج أو refreshTrigger
  useEffect(() => {
    if (mapInstance && mapInstance.loaded()) {
      console.log('🔄 Updating map markers...');
      addMarkersToMap(mapInstance, displayedPrograms, userLocation, lang);
    }
  }, [displayedPrograms, refreshTrigger, mapInstance, userLocation, lang]);

  // دالة بدء الرحلة
  const startTrip = async () => {
    if (!mapInstance || !userLocation || !selectedProgram) {
      alert(lang === 'ar' ? 'يرجى اختيار برنامج أولاً' : 'Please select a program first');
      return;
    }

    // الحصول على إحداثيات البرنامج
    let programCoords = null;
    if (selectedProgram.coords && Array.isArray(selectedProgram.coords)) {
      programCoords = selectedProgram.coords;
    } else if (selectedProgram.location_lng && selectedProgram.location_lat) {
      programCoords = [parseFloat(selectedProgram.location_lng), parseFloat(selectedProgram.location_lat)];
    }
    
    if (!programCoords) {
      alert(lang === 'ar' ? 'لا توجد إحداثيات للبرنامج' : 'Program coordinates not found');
      return;
    }

    const directions = new MapboxDirections({
      accessToken: mapboxgl.accessToken,
      unit: "metric",
      profile: `mapbox/${transport}`,
      interactive: false
    });
    
    mapInstance.addControl(directions, "top-left");
    directions.setOrigin(userLocation);
    directions.setDestination(programCoords);

    directions.on("route", (e) => {
      const route = e.route && e.route[0];
      if (route) {
        const distanceKm = (route.distance / 1000).toFixed(2);
        const durationMin = Math.round(route.duration / 60);
        setTripInfo({ distanceKm, durationMin });
      }
    });
  };

  // دالة طلب المشاركة في البرنامج
  const requestProgram = (program) => {
    if (!user) {
      alert(lang === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please login first');
      return;
    }
    
    // حفظ الطلب في localStorage
    const requests = JSON.parse(localStorage.getItem('program_requests') || '[]');
    const newRequest = {
      id: Date.now(),
      program_id: program.id,
      program_name: program.name_ar || program.name,
      user_id: user.id,
      user_name: user.name,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    requests.push(newRequest);
    localStorage.setItem('program_requests', JSON.stringify(requests));
    
    alert(lang === 'ar' 
      ? '✅ تم إرسال طلب المشاركة في البرنامج. سيتم التواصل معك من قبل المرشد.' 
      : '✅ Program participation request sent. The guide will contact you.'
    );
  };

  return (
    <div className="h-full relative flex flex-col">
      {/* شريط علوي */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 text-white flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center ml-2">
              {user?.avatar ? (
                <img src={user.avatar} alt={user?.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <User size={20} className="text-white" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold">{user?.name}</h1>
              <p className="text-white/80 text-xs flex items-center">
                <MapPin className="w-3 h-3 ml-1" />
                {lang === 'ar' ? 'استكشف البرامج القريبة' : 'Explore nearby programs'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button onClick={() => setPage('home')} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition">
              <Home size={18} />
            </button>
            {user && (
              <button onClick={() => setPage("notifications")} className="relative p-2 rounded-full bg-white/20 hover:bg-white/30 transition">
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[16px] h-[16px] flex items-center justify-center text-[10px] border border-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
        
        {/* شريط البحث */}
        <div className="relative">
          <Search className="absolute right-3 top-2.5 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder={t('search')} 
            className="w-full p-2 pr-9 rounded-lg bg-white/20 placeholder-white/70 border border-white/30 focus:outline-none focus:border-white text-white text-sm" 
          />
        </div>

        {/* إحصائيات وفلتر */}
        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-white/80">
            📌 {displayedPrograms.length} {lang === 'ar' ? 'برنامج متاح' : 'programs available'}
          </div>
          {isGuide && (
            <button
              onClick={() => setShowMyProgramsOnly(!showMyProgramsOnly)}
              className={`text-xs px-2 py-1 rounded-lg transition ${showMyProgramsOnly ? 'bg-yellow-500 text-white' : 'bg-white/20 text-white'}`}
            >
              {showMyProgramsOnly ? (lang === 'ar' ? '📌 برامجي فقط' : '📌 My Programs Only') : (lang === 'ar' ? '🌍 كل البرامج' : '🌍 All Programs')}
            </button>
          )}
        </div>
      </div>

      {/* الخريطة */}
      <div className="flex-1 w-full min-h-0">
        <div ref={mapContainerRef} className="h-full w-full" />
      </div>

      {/* تفاصيل البرنامج المحدد */}
      {selectedProgram && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border-2 border-green-500">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-bold text-lg dark:text-white">
                  {lang === "ar" ? (selectedProgram.name_ar || selectedProgram.name) : (selectedProgram.name_en || selectedProgram.name)}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {lang === "ar" ? "المرشد:" : "Guide:"} {selectedProgram.guide_name}
                </p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm mr-1">{selectedProgram.rating || 4.5}</span>
                  </div>
                  <span className="text-sm font-bold text-green-600">{selectedProgram.price} {lang === 'ar' ? 'ريال' : 'SAR'}</span>
                  <span className="text-sm text-gray-500">{selectedProgram.duration}</span>
                </div>
                {selectedProgram.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{selectedProgram.description}</p>
                )}
              </div>
              <button onClick={() => setSelectedProgram(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 p-1">✕</button>
            </div>
            
            {tripInfo && (
              <div className="text-sm mt-2 text-gray-600 dark:text-gray-300 bg-green-50 dark:bg-green-900/20 p-2 rounded-lg mb-2">
                📍 {t('distance')}: {tripInfo.distanceKm} كم — ⏱️ {t('duration')}: {tripInfo.durationMin} دقيقة
              </div>
            )}
            
            <div className="flex items-center justify-between gap-2 mt-2">
              <div className="flex items-center gap-2">
                <select 
                  value={transport} 
                  onChange={(e) => setTransport(e.target.value)} 
                  className="border rounded-lg px-2 py-1.5 text-sm dark:bg-gray-700 dark:text-white"
                >
                  <option value="driving">🚗 {t('driving')}</option>
                  <option value="walking">🚶 {t('walking')}</option>
                  <option value="cycling">🚲 {t('cycling')}</option>
                </select>
                <button 
                  onClick={startTrip} 
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition"
                >
                  🗺️ {t('startTrip')}
                </button>
              </div>
              
              {user?.role !== 'guide' && user?.type !== 'guide' && !user?.isGuide && (
                <button 
                  onClick={() => requestProgram(selectedProgram)} 
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
                >
                  ✉️ {lang === "ar" ? "طلب المشاركة" : "Request to Join"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}