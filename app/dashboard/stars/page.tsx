"use client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import React, { useState, useEffect } from 'react';
import { 
  mdiStar, 
  mdiPlus, 
  mdiDelete, 
  mdiPencil, 
  mdiStarOutline,
  mdiClose,
  mdiCheck
} from '@mdi/js';
import Icon from '../../_components/Icon';
import Button from '../../_components/Button';
import SectionMain from '../../_components/Section/Main';
import SectionTitleLineWithButton from '../../_components/Section/TitleLineWithButton';
import CardBox from '../../_components/CardBox';
import FormField from '../../_components/FormField';
import CardBoxModal from '../../_components/CardBox/Modal';
import { toast } from 'sonner';
import PendingStarRequests from './PendingStarRequests';

// Firebase
import { db } from '../../../firebase-config';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';

// Interfaces
import { StarReward } from '../../_interfaces';

const STAR_COLORS = [
  {
    value: 'white',
    label: 'White',
    bgClass: 'bg-gray-600 dark:bg-gray-500/30',
    textClass: 'text-gray-200 dark:text-gray-100',
    borderClass: 'border-gray-300 dark:border-gray-200',
    ringClass: 'ring-gray-200 dark:ring-gray-400'
  },
  {
    value: 'pink',
    label: 'Pink',
    bgClass: 'bg-pink-100',
    textClass: 'text-pink-800 dark:text-pink-300',
    borderClass: 'border-pink-300 dark:border-pink-500',
    ringClass: 'ring-pink-200 dark:ring-pink-400'
  },
  {
    value: 'yellow',
    label: 'Yellow',
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-800 dark:text-yellow-300',
    borderClass: 'border-yellow-300 dark:border-yellow-500',
    ringClass: 'ring-yellow-200 dark:ring-yellow-400'
  },
  {
    value: 'orange',
    label: 'Orange',
    bgClass: 'bg-orange-100',
    textClass: 'text-orange-800 dark:text-orange-300',
    borderClass: 'border-orange-300 dark:border-orange-500',
    ringClass: 'ring-orange-200 dark:ring-orange-400'
  },
  {
    value: 'blue',
    label: 'Blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-800 dark:text-blue-300',
    borderClass: 'border-blue-300 dark:border-blue-500',
    ringClass: 'ring-blue-200 dark:ring-blue-400'
  }
] as const;

const StarManagementPage = () => {
  const [starRewards, setStarRewards] = useState<StarReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<StarReward | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    color: 'white' as 'white' | 'pink' | 'yellow' | 'orange' | 'blue',
    amount: 1,
    setLimit: 1,
    isActive: true
  });

  // Fetch star rewards with real-time updates
  useEffect(() => {
    const starRewardsQuery = query(
      collection(db, 'starRewards'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(starRewardsQuery, (snapshot) => {
      const rewards = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as StarReward));
      
      setStarRewards(rewards);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching star rewards:', error);
      toast.error('Failed to load star rewards');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      color: 'white',
      amount: 5,
      setLimit: -1,
      isActive: true
    });
    setEditingReward(null);
  };

  const handleOpenModal = (reward?: StarReward) => {
    if (reward) {
      setEditingReward(reward);
      setFormData({
        name: reward.name,
        color: reward.color,
        amount: reward.amount,
        setLimit: reward.setLimit,
        isActive: reward.isActive
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!formData.name.trim()) {
      toast.error('Please enter a reward name');
      return;
    }
    
    if (formData.amount < 1) {
      toast.error('Amount must be at least 1 star');
      return;
    }
    
    if (formData.setLimit < 1 && formData.setLimit !== -1) {
      toast.error('Set limit must be at least 1 or No Limit');
      return;
    }

    try {
      if (editingReward) {
        // Update existing reward
        const rewardRef = doc(db, 'starRewards', editingReward.id);
        await updateDoc(rewardRef, {
          name: formData.name.trim(),
          color: formData.color,
          amount: formData.amount,
          setLimit: formData.setLimit,
          isActive: formData.isActive,
          updatedAt: serverTimestamp(),
          updatedBy: 'admin' // You can replace this with actual admin info
        });
        toast.success('Star reward updated successfully');
      } else {
        // Create new reward
        await addDoc(collection(db, 'starRewards'), {
          name: formData.name.trim(),
          color: formData.color,
          amount: formData.amount,
          setLimit: formData.setLimit,
          isActive: formData.isActive,
          createdAt: serverTimestamp(),
          createdBy: 'admin' // You can replace this with actual admin info
        });
        toast.success('Star reward created successfully');
      }
      
      handleCloseModal();
    } catch (error) {
      console.error('Error saving star reward:', error);
      toast.error('Failed to save star reward');
    }
  };

  const handleDelete = async (reward: StarReward) => {
    if (!confirm(`Are you sure you want to delete "${reward.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'starRewards', reward.id));
      toast.success('Star reward deleted successfully');
    } catch (error) {
      console.error('Error deleting star reward:', error);
      toast.error('Failed to delete star reward');
    }
  };

  const toggleActive = async (reward: StarReward) => {
    try {
      const rewardRef = doc(db, 'starRewards', reward.id);
      await updateDoc(rewardRef, {
        isActive: !reward.isActive,
        updatedAt: serverTimestamp(),
        updatedBy: 'admin'
      });
      toast.success(`Star reward ${reward.isActive ? 'deactivated' : 'activated'}`);
    } catch (error) {
      console.error('Error toggling star reward status:', error);
      toast.error('Failed to update star reward status');
    }
  };

  const getColorClasses = (color: string) => {
    const colorConfig = STAR_COLORS.find(c => c.value === color);
    return colorConfig || STAR_COLORS[0];
  };

  if (loading) {
    return (
      <SectionMain>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading star rewards...</div>
        </div>
      </SectionMain>
    );
  }

  return (
    <SectionMain>
      <SectionTitleLineWithButton 
        icon={mdiStar} 
        title="Star Management" 
        main
      >
        <Button
          icon={mdiPlus}
          label="Create New Reward"
          color="success"
          onClick={() => handleOpenModal()}
        />
      </SectionTitleLineWithButton>

      {/* Pending Star Requests Section */}
      <PendingStarRequests />

      {/* Star Rewards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {starRewards.map((reward) => {
          const colorConfig = getColorClasses(reward.color);
          
          return (
            <div 
              key={reward.id} 
              className="group relative bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transform hover:-translate-y-1"
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/5 dark:to-white/5 rounded-2xl"></div>
              
              {/* Content */}
              <div className="relative p-6">
                {/* Header with star icon and status */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className={`relative p-3 rounded-2xl ${colorConfig.bgClass} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon 
                        path={mdiStar} 
                        size={28} 
                        className={`${colorConfig.textClass} drop-shadow-sm mt-1`}
                      />
                      {/* Glow effect */}
                      <div className={`absolute inset-0 rounded-2xl ${colorConfig.bgClass} opacity-10 blur-lg group-hover:opacity-30 transition-opacity duration-300`}></div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100 mb-2 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                        {reward.name}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm border ${
                          reward.isActive 
                            ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300 dark:from-green-800 dark:to-green-700 dark:text-green-100 dark:border-green-600'
                            : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300 dark:from-gray-700 dark:to-gray-600 dark:text-gray-300 dark:border-gray-500'
                        }`}>
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            reward.isActive ? 'bg-green-500' : 'bg-gray-500'
                          }`}></div>
                          {reward.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex items-center space-x-2 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={() => toggleActive(reward)}
                      className={`p-2.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 ${
                        reward.isActive
                          ? 'text-orange-600 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 border border-orange-200 dark:border-orange-700'
                          : 'text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-700'
                      }`}
                      title={reward.isActive ? 'Deactivate' : 'Activate'}
                    >
                      <Icon path={reward.isActive ? mdiClose : mdiCheck} size={18} />
                    </button>
                    <button
                      onClick={() => handleOpenModal(reward)}
                      className="p-2.5 rounded-xl text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 border border-blue-200 dark:border-blue-700"
                      title="Edit"
                    >
                      <Icon path={mdiPencil} size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(reward)}
                      className="p-2.5 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 border border-red-200 dark:border-red-700"
                      title="Delete"
                    >
                      <Icon path={mdiDelete} size={18} />
                    </button>
                  </div>
                </div>

                {/* Reward details */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-600/50 backdrop-blur-sm">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Stars Awarded</span>
                    <div className="flex items-center space-x-2 bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-yellow-800/30 dark:to-yellow-700/30 px-3 py-1.5 rounded-lg border border-yellow-300/50 dark:border-yellow-600/50">
                      <Icon path={mdiStar} size={18} className="text-yellow-600 dark:text-yellow-400" />
                      <span className="font-bold text-lg text-yellow-800 dark:text-yellow-300">
                        {reward.amount}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-600/50 backdrop-blur-sm">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Claim Limit</span>
                    <div className="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-800/30 dark:to-purple-700/30 rounded-lg border border-purple-300/50 dark:border-purple-600/50">
                      <span className="font-bold text-lg text-purple-800 dark:text-purple-300">
                        {reward.setLimit === -1 ? '∞' : reward.setLimit}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-600/50 backdrop-blur-sm">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Theme Color</span>
                    <div className="flex items-center space-x-3">
                      <div className={`relative w-6 h-6 rounded-full ${reward.color === 'white' ? 'bg-gray-200' : colorConfig.bgClass} border-2 ${colorConfig.borderClass} shadow-lg`}>
                        <div className={`absolute inset-0 rounded-full ${reward.color === 'white' ? 'bg-gray-200' : colorConfig.bgClass} opacity-60 blur-sm`}></div>
                      </div>
                      <span className={`text-sm font-semibold ${colorConfig.textClass} capitalize px-2 py-1 rounded-md bg-white/70 dark:bg-gray-700/70`}>
                        {reward.color}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subtle bottom accent */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${colorConfig.bgClass} rounded-b-2xl opacity-60`}></div>
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {starRewards.length === 0 && (
          <div className="col-span-full">
            <CardBox>
              <div className="text-center py-12">
                <Icon path={mdiStarOutline} size={48} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No Star Rewards Yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Create your first star reward to motivate students with a point-based system.
                </p>
                <Button
                  icon={mdiPlus}
                  label="Create First Reward"
                  color="success"
                  onClick={() => handleOpenModal()}
                />
              </div>
            </CardBox>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <CardBoxModal modalClassName='pr-4 max-w-2xl'
        title={editingReward ? '⭐ Edit Star Reward' : '⭐ Create New Star Reward'}
        buttonColor="success"
        buttonLabel={editingReward ? 'Update Reward' : 'Create Reward'}
        isActive={isModalOpen}
        onConfirm={() => handleSubmit()}
        onCancel={handleCloseModal}
      >
        <div className="space-y-8 p-2">
          {/* Reward Name - Clean and minimal */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Reward Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Perfect Attendance Star"
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              required
            />
          </div>

          {/* Status Toggle - Modern switch */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${formData.isActive ? 'bg-green-500' : 'bg-gray-400'} shadow-sm`}></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Reward</span>
            </div>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                formData.isActive ? 'bg-green-500 shadow-lg shadow-green-500/30' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                  formData.isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Color Selection - Visual and creative */}
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Theme Color
            </label>
            <div className="grid grid-cols-5 gap-3">
              {STAR_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color: color.value as any }))}
                  className={`group relative p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    formData.color === color.value
                      ? `${color.borderClass} ${color.ringClass} shadow-lg scale-105`
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <div className={`relative p-3 rounded-xl ${color.bgClass} shadow-md group-hover:shadow-lg transition-all duration-200`}>
                      <Icon path={mdiStar} size={24} className={color.textClass} />
                      {formData.color === color.value && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <Icon path={mdiCheck} size={10} className="text-white" />
                        </div>
                      )}
                    </div>
                    <span className={`text-xs font-medium ${color.textClass} capitalize`}>
                      {color.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Star Amount - Minimal circular selection */}
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Star Value
            </label>
            <div className="flex justify-center">
              <div className="flex space-x-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-2xl">
                {[5, 10, 15, 20].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, amount: value }))}
                    className={`relative w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      formData.amount === value
                        ? `${getColorClasses(formData.color).bgClass} ${getColorClasses(formData.color).borderClass} shadow-lg scale-110 ring-2 ${getColorClasses(formData.color).ringClass}`
                        : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-md'
                    }`}
                  >
                    <span className={`font-bold text-lg ${
                      formData.amount === value 
                        ? getColorClasses(formData.color).textClass 
                        : 'text-gray-600 dark:text-gray-300'
                    }`}>
                      {value}
                    </span>
                    {formData.amount === value && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                        <div className={`w-2 h-2 rounded-full ${getColorClasses(formData.color).bgClass} shadow-sm`}></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Claim Limit - Clean input design */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Claim Limit
            </label>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, setLimit: -1 }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  formData.setLimit === -1
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                ∞ Unlimited
              </button>
              <div className="flex-1 relative">
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.setLimit === -1 ? '' : formData.setLimit}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    setLimit: e.target.value === '' ? -1 : parseInt(e.target.value) || 1
                  }))}
                  placeholder="Set limit"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>
          </div>
        </div>
      </CardBoxModal>
    </SectionMain>
  );
};

export default StarManagementPage;
