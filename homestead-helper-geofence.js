import React, { useState, useEffect, useRef } from 'react';
import { Camera, TrendingUp, Calendar, Image, Bot, Eye, Mail, Plus, X, Download, Upload, BarChart3, LineChart as LineChartIcon, Settings, MessageSquare, Activity, Leaf, Home, Wrench, Egg, Sun, Moon, ExternalLink, Zap, MapPin, Bell } from 'lucide-react';

export default function HomesteadHelperPro() {
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [tasks, setTasks] = useState({});
  const [photos, setPhotos] = useState({});
  const [analytics, setAnalytics] = useState({});
  const [showAgent, setShowAgent] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showCameraFeed, setShowCameraFeed] = useState(false);
  const [showGeofences, setShowGeofences] = useState(false);
  const [agentInput, setAgentInput] = useState('');
  const [agentMessages, setAgentMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [cameraFeeds, setCameraFeeds] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [geofences, setGeofences] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState('prompt');
  const [activeReminders, setActiveReminders] = useState([]);
  const fileInputRef = useRef(null);
  const locationWatchId = useRef(null);

  // Default modules for the homestead
  const defaultModules = [
    { id: 'garden', name: 'Garden', icon: Leaf, color: '#4ade80', emoji: '🌱' },
    { id: 'greenhouse', name: 'Greenhouse', icon: Home, color: '#22d3ee', emoji: '🏡' },
    { id: 'orchard', name: 'Fruit & Orchard', icon: Leaf, color: '#f97316', emoji: '🍎' },
    { id: 'bees', name: 'Beekeeping', icon: Activity, color: '#fbbf24', emoji: '🐝' },
    { id: 'livestock', name: 'Sheep & Goats', icon: Activity, color: '#f87171', emoji: '🐑' },
    { id: 'birds', name: 'Birds', icon: Egg, color: '#fcd34d', emoji: '🐓' },
    { id: 'farmstand', name: 'Farm Stand', icon: Home, color: '#10b981', emoji: '🏪' },
    { id: 'property', name: 'Property', icon: Wrench, color: '#a78bfa', emoji: '🔧' },
    { id: 'household', name: 'Household', icon: Home, color: '#fb923c', emoji: '🏠' },
  ];

  // Camera feed configuration
  const defaultCameras = [
    { id: 'barn', name: 'Barn Feed Storage', url: 'http://192.168.1.100/stream', module: 'livestock' },
    { id: 'coop', name: 'Chicken Coop', url: 'http://192.168.1.101/stream', module: 'birds' },
    { id: 'greenhouse', name: 'Greenhouse', url: 'http://192.168.1.102/stream', module: 'greenhouse' },
    { id: 'bee-yard', name: 'Bee Yard', url: 'http://192.168.1.103/stream', module: 'bees' },
    { id: 'farmstand', name: 'Farm Stand', url: 'http://192.168.1.104/stream', module: 'farmstand' },
  ];

  // Default geofences (you'll customize these with your actual coordinates)
  const defaultGeofences = [
    {
      id: 'farmstand',
      name: 'Farm Stand',
      moduleId: 'farmstand',
      latitude: 0, // Replace with your actual coordinates
      longitude: 0,
      radius: 50, // meters
      emoji: '🏪',
      enabled: true,
      reminders: [
        'Check if anyone bought eggs and grab the cash',
        'Replace any purchased items with fresh stock',
        'Make sure the cash box is secure',
        'Check that prices are clearly displayed'
      ]
    },
    {
      id: 'greenhouse',
      name: 'Greenhouse',
      moduleId: 'greenhouse',
      latitude: 0,
      longitude: 0,
      radius: 30,
      emoji: '🏡',
      enabled: true,
      reminders: [
        'Check soil moisture levels',
        'Ventilate if it\'s too hot',
        'Look for any pest issues'
      ]
    },
    {
      id: 'beehives',
      name: 'Bee Yard',
      moduleId: 'bees',
      latitude: 0,
      longitude: 0,
      radius: 40,
      emoji: '🐝',
      enabled: true,
      reminders: [
        'Check hive entrances for activity',
        'Look for signs of pests or disease',
        'Make sure water source is available'
      ]
    },
    {
      id: 'barn',
      name: 'Barn',
      moduleId: 'livestock',
      latitude: 0,
      longitude: 0,
      radius: 50,
      emoji: '🐑',
      enabled: true,
      reminders: [
        'Check water troughs are full',
        'Count feed bags remaining',
        'Look for any sick animals'
      ]
    },
    {
      id: 'coop',
      name: 'Chicken Coop',
      moduleId: 'birds',
      latitude: 0,
      longitude: 0,
      radius: 30,
      emoji: '🐓',
      enabled: true,
      reminders: [
        'Collect eggs',
        'Check feeder and water',
        'Look for any injured birds'
      ]
    }
  ];

  // Initialize app
  useEffect(() => {
    loadData();
    setCameraFeeds(defaultCameras);
    requestLocationPermission();
    
    // Handle URL parameters for voice commands
    handleURLParameters();
  }, []);

  // Handle URL parameters for Siri shortcuts
  function handleURLParameters() {
    const params = new URLSearchParams(window.location.search);
    
    if (params.get('module')) {
      setTimeout(() => {
        const module = modules.find(m => m.id === params.get('module'));
        if (module) setSelectedModule(module);
      }, 500);
    }
    
    if (params.get('cmd') === 'add' && params.get('task')) {
      setTimeout(() => {
        const moduleId = params.get('module') || 'household';
        addTask(moduleId, decodeURIComponent(params.get('task')));
      }, 500);
    }
    
    if (params.get('action') === 'assistant') {
      setShowAgent(true);
      if (params.get('q')) {
        setTimeout(() => {
          sendToAgent(decodeURIComponent(params.get('q')));
        }, 500);
      }
    }
    
    if (params.get('camera')) {
      setTimeout(() => {
        const camera = cameraFeeds.find(c => c.id === params.get('camera'));
        if (camera && params.get('action') === 'analyze') {
          analyzeCameraFeed(camera);
        }
      }, 500);
    }
  }

  // Request location permission and start tracking
  async function requestLocationPermission() {
    if (!navigator.geolocation) {
      console.log('Geolocation not supported');
      return;
    }

    // Request notification permission too
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    // Request location permission
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      
      setLocationPermission('granted');
      setCurrentLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
      
      // Start watching location
      startLocationTracking();
    } catch (error) {
      setLocationPermission('denied');
      console.log('Location permission denied');
    }
  }

  // Start continuous location tracking
  function startLocationTracking() {
    if (locationWatchId.current) return;
    
    locationWatchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setCurrentLocation(newLocation);
        checkGeofences(newLocation);
      },
      (error) => {
        console.log('Location tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000, // 10 seconds
        timeout: 5000
      }
    );
  }

  // Stop location tracking
  function stopLocationTracking() {
    if (locationWatchId.current) {
      navigator.geolocation.clearWatch(locationWatchId.current);
      locationWatchId.current = null;
    }
  }

  // Calculate distance between two points (Haversine formula)
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  // Check if user entered any geofences
  function checkGeofences(location) {
    geofences.forEach(geofence => {
      if (!geofence.enabled) return;
      
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        geofence.latitude,
        geofence.longitude
      );

      // User is within geofence
      if (distance <= geofence.radius) {
        // Check if we already showed a reminder recently
        const lastReminder = localStorage.getItem(`geofence-${geofence.id}-last`);
        const now = Date.now();
        const cooldown = 30 * 60 * 1000; // 30 minutes cooldown
        
        if (!lastReminder || (now - parseInt(lastReminder)) > cooldown) {
          triggerGeofenceReminder(geofence);
          localStorage.setItem(`geofence-${geofence.id}-last`, now.toString());
        }
      }
    });
  }

  // Trigger reminder when entering geofence
  function triggerGeofenceReminder(geofence) {
    const module = modules.find(m => m.id === geofence.moduleId);
    const moduleTasks = tasks[geofence.moduleId] || [];
    const pendingTasks = moduleTasks.filter(t => !t.completed);
    
    // Combine geofence reminders with pending tasks
    const reminders = [
      ...geofence.reminders,
      ...pendingTasks.slice(0, 3).map(t => `Task: ${t.text}`)
    ];

    // Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(`${geofence.emoji} You're near ${geofence.name}!`, {
        body: reminders[0],
        icon: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='75' font-size='70' x='50' text-anchor='middle'>${geofence.emoji}</text></svg>`,
        tag: `geofence-${geofence.id}`,
        requireInteraction: false,
        silent: false
      });

      notification.onclick = () => {
        window.focus();
        const module = modules.find(m => m.id === geofence.moduleId);
        if (module) setSelectedModule(module);
        setActiveReminders(reminders);
      };
    }

    // Also add to active reminders in app
    setActiveReminders(reminders);

    // Trigger IFTTT
    triggerIFTTT('geofence_entered', {
      v1: geofence.name,
      v2: reminders[0],
      v3: new Date().toISOString()
    });
  }

  // Save/Update geofence
  async function saveGeofence(geofence) {
    const newGeofences = geofences.map(g => 
      g.id === geofence.id ? geofence : g
    );
    
    if (!geofences.find(g => g.id === geofence.id)) {
      newGeofences.push(geofence);
    }
    
    setGeofences(newGeofences);
    await saveData('homestead-geofences', newGeofences);
  }

  // Set current location as geofence center
  function setCurrentLocationAsGeofence(moduleId) {
    if (!currentLocation) {
      alert('Please enable location access first');
      return;
    }

    const module = modules.find(m => m.id === moduleId);
    const newGeofence = {
      id: `custom-${Date.now()}`,
      name: `${module.name} Location`,
      moduleId: moduleId,
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      radius: 50,
      emoji: module.emoji,
      enabled: true,
      reminders: [
        'Check pending tasks while you\'re here',
        'Take photos of current status',
        'Update inventory if needed'
      ]
    };

    saveGeofence(newGeofence);
    alert(`Geofence created at current location for ${module.name}!`);
  }

  // Load persisted data
  async function loadData() {
    try {
      const storedModules = await window.storage?.get('homestead-modules');
      const storedTasks = await window.storage?.get('homestead-tasks');
      const storedPhotos = await window.storage?.get('homestead-photos');
      const storedAnalytics = await window.storage?.get('homestead-analytics');
      const storedGeofences = await window.storage?.get('homestead-geofences');
      
      if (storedModules?.value) {
        setModules(JSON.parse(storedModules.value));
      } else {
        setModules(defaultModules);
      }
      
      if (storedTasks?.value) setTasks(JSON.parse(storedTasks.value));
      if (storedPhotos?.value) setPhotos(JSON.parse(storedPhotos.value));
      if (storedAnalytics?.value) setAnalytics(JSON.parse(storedAnalytics.value));
      
      if (storedGeofences?.value) {
        setGeofences(JSON.parse(storedGeofences.value));
      } else {
        setGeofences(defaultGeofences);
      }
    } catch (e) {
      setModules(defaultModules);
      setGeofences(defaultGeofences);
      console.log('Using default data');
    }
  }

  // Save data
  async function saveData(key, value) {
    try {
      await window.storage?.set(key, JSON.stringify(value));
    } catch (e) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  // Add task
  function addTask(moduleId, task) {
    const newTasks = { ...tasks };
    if (!newTasks[moduleId]) newTasks[moduleId] = [];
    newTasks[moduleId].push({
      id: Date.now(),
      text: task,
      completed: false,
      created: new Date().toISOString(),
      completedDate: null
    });
    setTasks(newTasks);
    saveData('homestead-tasks', newTasks);
    updateAnalytics(moduleId, 'task_added');
  }

  // Toggle task
  function toggleTask(moduleId, taskId) {
    const newTasks = { ...tasks };
    const task = newTasks[moduleId]?.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      task.completedDate = task.completed ? new Date().toISOString() : null;
      setTasks(newTasks);
      saveData('homestead-tasks', newTasks);
      updateAnalytics(moduleId, task.completed ? 'task_completed' : 'task_uncompleted');
      
      if (task.completed) {
        triggerIFTTT('task_completed', {
          v1: task.text,
          v2: moduleId,
          v3: new Date().toISOString()
        });
      }
    }
  }

  // Delete task
  function deleteTask(moduleId, taskId) {
    const newTasks = { ...tasks };
    newTasks[moduleId] = newTasks[moduleId].filter(t => t.id !== taskId);
    setTasks(newTasks);
    saveData('homestead-tasks', newTasks);
  }

  // Add photo
  async function addPhoto(moduleId, file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const photoData = {
        id: Date.now(),
        data: e.target.result,
        date: new Date().toISOString(),
        moduleId,
        analyzed: false
      };
      
      const newPhotos = { ...photos };
      if (!newPhotos[moduleId]) newPhotos[moduleId] = [];
      newPhotos[moduleId].push(photoData);
      setPhotos(newPhotos);
      saveData('homestead-photos', newPhotos);
      updateAnalytics(moduleId, 'photo_added');
      
      analyzePhotoWithAI(photoData, moduleId);
    };
    reader.readAsDataURL(file);
  }

  // AI Photo Analysis
  async function analyzePhotoWithAI(photo, moduleId) {
    setIsLoading(true);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: photo.data.split(',')[1]
                }
              },
              {
                type: 'text',
                text: `Analyze this image from the ${moduleId} section of a homestead. Provide:
1. What you see
2. Health/condition assessment
3. Any issues or concerns
4. Actionable recommendations
5. Best practices to follow

Be specific and practical.`
              }
            ]
          }]
        })
      });

      const data = await response.json();
      const analysis = data.content[0].text;
      
      const newPhotos = { ...photos };
      const photoIndex = newPhotos[moduleId].findIndex(p => p.id === photo.id);
      if (photoIndex !== -1) {
        newPhotos[moduleId][photoIndex].analysis = analysis;
        newPhotos[moduleId][photoIndex].analyzed = true;
        setPhotos(newPhotos);
        saveData('homestead-photos', newPhotos);
      }
      
      setAgentMessages(prev => [...prev, {
        role: 'assistant',
        content: `📸 Photo Analysis:\n\n${analysis}`
      }]);
      
    } catch (e) {
      console.log('Photo analysis failed', e);
    }
    setIsLoading(false);
  }

  // Camera feed analysis
  async function analyzeCameraFeed(camera) {
    setIsLoading(true);
    setShowAgent(true);
    
    try {
      const frameData = await captureFrameFromCamera(camera.url);
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: frameData
                }
              },
              {
                type: 'text',
                text: `Analyze this camera feed from: ${camera.name}

Please provide:
1. Inventory count (bags, supplies, items visible)
2. Condition assessment
3. Any safety or maintenance issues
4. Recommendations for action
5. Should we restock/order supplies?

Camera purpose: ${getCameraPurpose(camera.module)}`
              }
            ]
          }]
        })
      });

      const data = await response.json();
      const analysis = data.content[0].text;
      
      setAgentMessages(prev => [...prev, {
        role: 'assistant',
        content: `🎥 Camera Analysis (${camera.name}):\n\n${analysis}`
      }]);
      
      if (analysis.toLowerCase().includes('order') || analysis.toLowerCase().includes('low on')) {
        await autoGenerateSupplyEmail(analysis, camera);
      }
      
    } catch (e) {
      setAgentMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Could not analyze camera feed. Check camera connection.`
      }]);
    }
    
    setIsLoading(false);
  }

  function getCameraPurpose(module) {
    const purposes = {
      livestock: 'Monitor feed storage and animal welfare',
      birds: 'Monitor poultry health and supplies',
      greenhouse: 'Monitor plant health and conditions',
      bees: 'Monitor bee activity and hive health',
      farmstand: 'Monitor inventory, cash box, and sales activity'
    };
    return purposes[module] || 'General monitoring';
  }

  async function captureFrameFromCamera(cameraUrl) {
    return await fetch(cameraUrl + '/snapshot').then(r => r.blob()).then(b => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(b);
      });
    }).catch(() => '');
  }

  async function autoGenerateSupplyEmail(analysis, camera) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Based on this analysis, draft a professional email to our supplier:

${analysis}

Include specific items and quantities needed.`
        }]
      })
    });

    const data = await response.json();
    const emailDraft = data.content[0].text;
    
    setAgentMessages(prev => [...prev, {
      role: 'assistant',
      content: `📧 Draft Email:\n\n${emailDraft}`
    }]);
  }

  function updateAnalytics(moduleId, action) {
    const newAnalytics = { ...analytics };
    const today = new Date().toISOString().split('T')[0];
    
    if (!newAnalytics[moduleId]) {
      newAnalytics[moduleId] = { daily: {}, monthly: {}, yearly: {} };
    }
    
    if (!newAnalytics[moduleId].daily[today]) {
      newAnalytics[moduleId].daily[today] = {};
    }
    newAnalytics[moduleId].daily[today][action] = 
      (newAnalytics[moduleId].daily[today][action] || 0) + 1;
    
    const month = today.substring(0, 7);
    if (!newAnalytics[moduleId].monthly[month]) {
      newAnalytics[moduleId].monthly[month] = {};
    }
    newAnalytics[moduleId].monthly[month][action] = 
      (newAnalytics[moduleId].monthly[month][action] || 0) + 1;
    
    const year = today.substring(0, 4);
    if (!newAnalytics[moduleId].yearly[year]) {
      newAnalytics[moduleId].yearly[year] = {};
    }
    newAnalytics[moduleId].yearly[year][action] = 
      (newAnalytics[moduleId].yearly[year][action] || 0) + 1;
    
    setAnalytics(newAnalytics);
    saveData('homestead-analytics', newAnalytics);
  }

  function getAnalyticsSummary(moduleId, period = 'monthly') {
    const moduleAnalytics = analytics[moduleId];
    if (!moduleAnalytics) return null;
    
    const data = moduleAnalytics[period];
    const keys = Object.keys(data || {}).sort().slice(-12);
    
    return keys.map(key => ({
      period: key,
      tasks_added: data[key]?.task_added || 0,
      tasks_completed: data[key]?.task_completed || 0,
      photos_added: data[key]?.photo_added || 0,
    }));
  }

  function exportToCalendar(task, moduleId) {
    const module = modules.find(m => m.id === moduleId);
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Homestead Helper//EN
BEGIN:VEVENT
UID:${task.id}@homestead-helper
DTSTAMP:${formatDateForICS(new Date())}
DTSTART:${formatDateForICS(new Date())}
SUMMARY:${task.text}
DESCRIPTION:Module: ${module?.name || moduleId}
LOCATION:Homestead
CATEGORIES:${moduleId}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${task.text.replace(/[^a-z0-9]/gi, '-')}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function formatDateForICS(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  async function triggerIFTTT(event, values = {}) {
    const IFTTT_KEY = 'YOUR_IFTTT_KEY_HERE';
    
    if (IFTTT_KEY === 'YOUR_IFTTT_KEY_HERE') {
      console.log('IFTTT not configured');
      return;
    }
    
    try {
      await fetch(`https://maker.ifttt.com/trigger/${event}/with/key/${IFTTT_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value1: values.v1,
          value2: values.v2,
          value3: values.v3
        })
      });
    } catch (e) {
      console.log('IFTTT trigger failed', e);
    }
  }

  async function sendToAgent(message, includeContext = true) {
    setIsLoading(true);
    const newMessages = [...agentMessages, { role: 'user', content: message }];
    setAgentMessages(newMessages);
    setAgentInput('');

    let contextInfo = '';
    if (includeContext) {
      const moduleSummaries = modules.map(m => {
        const moduleTasks = tasks[m.id] || [];
        const modulePhotos = photos[m.id] || [];
        return `${m.name}: ${moduleTasks.length} tasks (${moduleTasks.filter(t => !t.completed).length} pending), ${modulePhotos.length} photos`;
      }).join('\n');
      
      contextInfo = `\nCurrent Homestead Status:\n${moduleSummaries}`;
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: newMessages,
          system: `You are an expert homestead management AI assistant with deep knowledge of:
- Sustainable agriculture and permaculture
- Animal husbandry (sheep, goats, chickens)
- Beekeeping and pollinator management
- Orchard and fruit tree care
- Greenhouse management
- Farm stand operations and direct sales
- Seasonal planning and crop rotation
- Pest and disease diagnosis
- Equipment maintenance

${contextInfo}

Be practical, specific, and actionable.`
        })
      });

      const data = await response.json();
      const assistantMessage = data.content[0].text;
      
      setAgentMessages([...newMessages, { role: 'assistant', content: assistantMessage }]);
    } catch (e) {
      setAgentMessages([...newMessages, { 
        role: 'assistant', 
        content: 'Sorry, I had trouble connecting. Make sure Claude API access is enabled.' 
      }]);
    }
    
    setIsLoading(false);
  }

  async function exportAllData() {
    const allData = {
      modules: modules,
      tasks: tasks,
      photos: photos,
      analytics: analytics,
      geofences: geofences,
      exportDate: new Date().toISOString(),
      version: '2.1'
    };
    
    const blob = new Blob([JSON.stringify(allData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `homestead-backup-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importData(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        setModules(data.modules || defaultModules);
        setTasks(data.tasks || {});
        setPhotos(data.photos || {});
        setAnalytics(data.analytics || {});
        setGeofences(data.geofences || defaultGeofences);
        
        await saveData('homestead-modules', data.modules);
        await saveData('homestead-tasks', data.tasks);
        await saveData('homestead-photos', data.photos);
        await saveData('homestead-analytics', data.analytics);
        await saveData('homestead-geofences', data.geofences);
        
        alert('Data imported successfully!');
      } catch (e) {
        alert('Import failed. Please check file format.');
      }
    };
    reader.readAsText(file);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLocationTracking();
    };
  }, []);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-slate-950' : 'bg-orange-50'}`}>
      {/* Header */}
      <header className={`border-b backdrop-blur-sm sticky top-0 z-50 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-orange-100/80 border-orange-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🏡</div>
            <div>
              <h1 className={`text-2xl font-bold ${isDark ? 'text-orange-400' : 'text-orange-900'}`} 
                  style={{ fontFamily: '"Georgia", serif' }}>
                Homestead Helper Pro
              </h1>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-orange-700'}`}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {activeReminders.length > 0 && (
              <div className="relative">
                <button
                  className={`p-2 rounded-full animate-pulse ${
                    isDark ? 'bg-orange-600 text-white' : 'bg-orange-600 text-white'
                  }`}
                  onClick={() => setActiveReminders([])}
                >
                  <Bell className="w-5 h-5" />
                </button>
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeReminders.length}
                </span>
              </div>
            )}
            
            <button
              onClick={() => setShowGeofences(!showGeofences)}
              className={`p-2 rounded-full transition-all hover:scale-110 ${
                isDark ? 'bg-slate-800 text-green-400 hover:bg-slate-700' : 'bg-white text-green-600 hover:bg-green-50'
              }`}
              title="Geofencing"
            >
              <MapPin className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`p-2 rounded-full transition-all hover:scale-110 ${
                isDark ? 'bg-slate-800 text-purple-400 hover:bg-slate-700' : 'bg-white text-purple-600 hover:bg-purple-50'
              }`}
              title="Analytics"
            >
              <TrendingUp className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setShowCameraFeed(!showCameraFeed)}
              className={`p-2 rounded-full transition-all hover:scale-110 ${
                isDark ? 'bg-slate-800 text-blue-400 hover:bg-slate-700' : 'bg-white text-blue-600 hover:bg-blue-50'
              }`}
              title="Cameras"
            >
              <Eye className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setShowAgent(!showAgent)}
              className={`p-2 rounded-full transition-all hover:scale-110 ${
                isDark ? 'bg-orange-600 text-white hover:bg-orange-500' : 'bg-orange-600 text-white hover:bg-orange-700'
              }`}
              title="AI Assistant"
            >
              <Bot className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-full transition-all hover:scale-110 ${
                isDark ? 'bg-slate-800 text-yellow-400' : 'bg-white text-orange-600'
              }`}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={exportAllData}
              className={`p-2 rounded-full transition-all hover:scale-110 ${
                isDark ? 'bg-slate-800 text-green-400' : 'bg-white text-green-600'
              }`}
              title="Export"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Active Reminders Banner */}
      {activeReminders.length > 0 && (
        <div className={`border-b ${isDark ? 'bg-orange-900/30 border-orange-800' : 'bg-orange-200 border-orange-300'}`}>
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-start justify-between">
              <div>
                <p className={`font-bold mb-2 ${isDark ? 'text-orange-300' : 'text-orange-900'}`}>
                  📍 You're near a location! Here's what to check:
                </p>
                <ul className={`text-sm space-y-1 ${isDark ? 'text-orange-200' : 'text-orange-800'}`}>
                  {activeReminders.slice(0, 4).map((reminder, i) => (
                    <li key={i}>• {reminder}</li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => setActiveReminders([])}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-orange-800' : 'hover:bg-orange-300'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Module Grid */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {modules.map((module) => {
            const Icon = module.icon;
            const moduleTasks = tasks[module.id] || [];
            const modulePhotos = photos[module.id] || [];
            const completedCount = moduleTasks.filter(t => t.completed).length;
            const pendingCount = moduleTasks.length - completedCount;
            
            return (
              <div
                key={module.id}
                onClick={() => setSelectedModule(module)}
                className={`p-6 rounded-2xl cursor-pointer transition-all hover:scale-105 hover:shadow-2xl ${
                  isDark ? 'bg-slate-900 border-2 border-slate-800' : 'bg-white border-2 border-orange-200'
                } ${selectedModule?.id === module.id ? 'ring-4 ring-orange-400 ring-opacity-50' : ''}`}
                style={{
                  background: isDark 
                    ? `linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.9) 100%)`
                    : `linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(254, 243, 199, 0.5) 100%)`
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-orange-100'}`}>
                    <Icon className="w-6 h-6" style={{ color: module.color }} />
                  </div>
                  <div className="text-2xl">{module.emoji}</div>
                </div>
                
                <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`} 
                    style={{ fontFamily: '"Georgia", serif' }}>
                  {module.name}
                </h3>
                
                <div className="flex flex-col gap-1 text-sm">
                  <div className={isDark ? 'text-slate-400' : 'text-orange-700'}>
                    <span className="font-semibold text-orange-400">{pendingCount}</span> pending • 
                    <span className="font-semibold text-green-400"> {completedCount}</span> done
                  </div>
                  <div className={isDark ? 'text-slate-500' : 'text-orange-600'}>
                    📸 {modulePhotos.length} photos
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Module Detail Panel */}
        {selectedModule && (
          <div className={`p-6 rounded-2xl mb-8 ${
            isDark ? 'bg-slate-900 border-2 border-slate-800' : 'bg-white border-2 border-orange-200'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{selectedModule.emoji}</div>
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}
                    style={{ fontFamily: '"Georgia", serif' }}>
                  {selectedModule.name}
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentLocationAsGeofence(selectedModule.id)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    isDark ? 'bg-green-600 text-white hover:bg-green-500' : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                  title="Set current location as geofence"
                >
                  <MapPin className="w-4 h-4" />
                  Set Location
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    isDark ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  Photo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      addPhoto(selectedModule.id, e.target.files[0]);
                    }
                  }}
                />
                <button
                  onClick={() => setSelectedModule(null)}
                  className={`px-4 py-2 rounded-lg ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-orange-100 text-orange-900 hover:bg-orange-200'
                  }`}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Tasks */}
            <div className="mb-6">
              <h3 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                📋 Tasks
              </h3>
              <div className="space-y-3">
                {(tasks[selectedModule.id] || []).map((task) => (
                  <div
                    key={task.id}
                    className={`p-4 rounded-xl transition-all ${
                      isDark ? 'bg-slate-800 hover:bg-slate-750' : 'bg-orange-50 hover:bg-orange-100'
                    } ${task.completed ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        onClick={() => toggleTask(selectedModule.id, task.id)}
                        className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer ${
                          task.completed 
                            ? 'bg-green-500 border-green-500' 
                            : isDark ? 'border-slate-600' : 'border-orange-300'
                        }`}
                      >
                        {task.completed && <span className="text-white text-xs">✓</span>}
                      </div>
                      <div className="flex-1">
                        <p className={`${
                          task.completed ? 'line-through' : ''
                        } ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                          {task.text}
                        </p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-orange-600'}`}>
                          {new Date(task.created).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => exportToCalendar(task, selectedModule.id)}
                          className={`p-2 rounded-lg ${
                            isDark ? 'bg-slate-700 text-blue-400 hover:bg-slate-600' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                          }`}
                          title="Calendar"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteTask(selectedModule.id, task.id)}
                          className={`p-2 rounded-lg ${
                            isDark ? 'bg-slate-700 text-red-400 hover:bg-slate-600' : 'bg-red-100 text-red-600 hover:bg-red-200'
                          }`}
                          title="Delete"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className={`p-4 rounded-xl border-2 border-dashed ${
                  isDark ? 'border-slate-700 bg-slate-800/50' : 'border-orange-300 bg-orange-50/50'
                }`}>
                  <input
                    type="text"
                    placeholder="Add a new task..."
                    className={`w-full bg-transparent border-none outline-none ${
                      isDark ? 'text-slate-200 placeholder-slate-600' : 'text-slate-900 placeholder-orange-400'
                    }`}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        addTask(selectedModule.id, e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Photos */}
            {photos[selectedModule.id]?.length > 0 && (
              <div>
                <h3 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  📸 Photos
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {photos[selectedModule.id].map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img 
                        src={photo.data} 
                        alt="Homestead" 
                        className="w-full h-48 object-cover rounded-xl"
                      />
                      <div className={`absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl p-3 flex flex-col justify-between`}>
                        <div className="text-white text-xs">
                          {new Date(photo.date).toLocaleDateString()}
                        </div>
                        {photo.analyzed && (
                          <button
                            onClick={() => {
                              setShowAgent(true);
                              setAgentMessages(prev => [...prev, {
                                role: 'assistant',
                                content: `📸 Analysis:\n\n${photo.analysis}`
                              }]);
                            }}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-500"
                          >
                            View Analysis
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Geofencing Panel */}
        {showGeofences && (
          <div className={`p-6 rounded-2xl mb-8 ${
            isDark ? 'bg-slate-900 border-2 border-slate-800' : 'bg-white border-2 border-orange-200'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                📍 Location-Based Reminders
              </h2>
              <button
                onClick={() => setShowGeofences(false)}
                className={`px-4 py-2 rounded-lg ${
                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-orange-100 text-orange-900'
                }`}
              >
                Close
              </button>
            </div>

            {locationPermission !== 'granted' && (
              <div className={`p-4 rounded-lg mb-4 ${
                isDark ? 'bg-orange-900/20 border border-orange-800' : 'bg-orange-50 border border-orange-200'
              }`}>
                <p className={`text-sm ${isDark ? 'text-orange-300' : 'text-orange-900'}`}>
                  📍 <strong>Location access required</strong> - Enable location permissions in your browser to use geofencing features.
                </p>
                <button
                  onClick={requestLocationPermission}
                  className="mt-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-500"
                >
                  Enable Location
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {geofences.map(geofence => {
                const module = modules.find(m => m.id === geofence.moduleId);
                const distance = currentLocation ? calculateDistance(
                  currentLocation.latitude,
                  currentLocation.longitude,
                  geofence.latitude,
                  geofence.longitude
                ) : null;

                return (
                  <div key={geofence.id} className={`p-4 rounded-xl ${
                    isDark ? 'bg-slate-800' : 'bg-orange-50'
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{geofence.emoji}</span>
                        <div>
                          <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {geofence.name}
                          </h3>
                          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-orange-700'}`}>
                            Radius: {geofence.radius}m
                          </p>
                          {distance !== null && (
                            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-orange-600'}`}>
                              Distance: {Math.round(distance)}m away
                            </p>
                          )}
                        </div>
                      </div>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={geofence.enabled}
                          onChange={(e) => {
                            const updated = { ...geofence, enabled: e.target.checked };
                            saveGeofence(updated);
                          }}
                          className="sr-only peer"
                        />
                        <div className={`relative w-11 h-6 rounded-full transition peer-checked:bg-green-600 ${
                          isDark ? 'bg-slate-700' : 'bg-gray-300'
                        }`}>
                          <div className="absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition peer-checked:translate-x-5"></div>
                        </div>
                      </label>
                    </div>
                    <div className={`text-sm space-y-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      <p className="font-semibold">Reminders:</p>
                      {geofence.reminders.slice(0, 2).map((reminder, i) => (
                        <p key={i} className="text-xs">• {reminder}</p>
                      ))}
                      {geofence.reminders.length > 2 && (
                        <p className="text-xs opacity-75">+{geofence.reminders.length - 2} more...</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={`mt-4 p-4 rounded-lg ${
              isDark ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'
            }`}>
              <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-900'}`}>
                💡 <strong>How it works:</strong> When you enter a geofenced area, you'll get a notification with relevant reminders and pending tasks. 
                To set up geofences, visit each location and click "Set Location" in the module view.
              </p>
            </div>
          </div>
        )}

        {/* Analytics, Camera Feed panels continue... */}
        {/* (Previous analytics and camera panels remain the same) */}
      </main>

      {/* AI Agent Chat */}
      {showAgent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-4">
          <div className={`w-full max-w-2xl rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl ${
            isDark ? 'bg-slate-900' : 'bg-white'
          }`} style={{ maxHeight: '80vh' }}>
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-orange-100 border-orange-200'
            }`}>
              <div className="flex items-center gap-2">
                <Bot className={isDark ? 'text-orange-400' : 'text-orange-600'} />
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  AI Homestead Assistant
                </h3>
              </div>
              <button
                onClick={() => setShowAgent(false)}
                className={`px-3 py-1 rounded-lg ${
                  isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-orange-200 text-orange-900 hover:bg-orange-300'
                }`}
              >
                Close
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto" style={{ height: '400px' }}>
              {agentMessages.length === 0 && (
                <div className={`text-center py-8 ${isDark ? 'text-slate-500' : 'text-orange-600'}`}>
                  <Bot className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="mb-2">Ask me anything about your homestead!</p>
                  <p className="text-sm">I can help with:</p>
                  <ul className="text-sm mt-2 space-y-1">
                    <li>🌱 Crop planning & troubleshooting</li>
                    <li>🐑 Animal health & care</li>
                    <li>🐝 Beekeeping advice</li>
                    <li>🍎 Orchard management</li>
                    <li>🏪 Farm stand operations</li>
                    <li>📊 Data analysis & trends</li>
                  </ul>
                </div>
              )}
              
              {agentMessages.map((msg, i) => (
                <div key={i} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block max-w-[80%] p-3 rounded-2xl whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? isDark ? 'bg-orange-600 text-white' : 'bg-orange-600 text-white'
                      : isDark ? 'bg-slate-800 text-slate-200' : 'bg-orange-50 text-slate-900'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className={`text-left mb-4`}>
                  <div className={`inline-block p-3 rounded-2xl ${
                    isDark ? 'bg-slate-800 text-slate-200' : 'bg-orange-50 text-slate-900'
                  }`}>
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className={`p-4 border-t ${isDark ? 'border-slate-700' : 'border-orange-200'}`}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={agentInput}
                  onChange={(e) => setAgentInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && agentInput.trim() && !isLoading) {
                      sendToAgent(agentInput);
                    }
                  }}
                  placeholder="Ask about your homestead..."
                  className={`flex-1 px-4 py-3 rounded-xl border-2 outline-none transition-all ${
                    isDark 
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-orange-500' 
                      : 'bg-white border-orange-200 text-slate-900 placeholder-orange-400 focus:border-orange-500'
                  }`}
                  disabled={isLoading}
                />
                <button
                  onClick={() => agentInput.trim() && sendToAgent(agentInput)}
                  disabled={!agentInput.trim() || isLoading}
                  className={`px-6 py-3 rounded-xl font-medium transition-all ${
                    agentInput.trim() && !isLoading
                      ? 'bg-orange-600 text-white hover:bg-orange-500'
                      : isDark ? 'bg-slate-800 text-slate-600' : 'bg-orange-100 text-orange-300'
                  }`}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        .animate-bounce {
          animation: bounce 1s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}
