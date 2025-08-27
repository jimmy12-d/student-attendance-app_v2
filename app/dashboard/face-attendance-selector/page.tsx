"use client";

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { 
  mdiFaceRecognition, 
  mdiEye, 
  mdiCameraIris,
  mdiSpeedometer,
  mdiShieldCheck
} from '@mdi/js';

import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import CardBox from "../../_components/CardBox";
import { getPageTitle } from "../../_lib/config";
import Icon from "../../_components/Icon";

interface FaceSystemOption {
  title: string;
  description: string;
  route: string;
  icon: string;
  features: string[];
  status: 'stable' | 'new' | 'legacy';
  technology: string;
  pros: string[];
  cons: string[];
  recommended?: boolean;
}

const FaceAttendanceSelector = () => {
  const faceSystemOptions: FaceSystemOption[] = [
    {
      title: "TensorFlow Face Recognition",
      description: "Local TensorFlow-based face detection and recognition system using BlazeFace",
      route: "/dashboard/face-scan",
      icon: mdiCameraIris,
      technology: "TensorFlow.js + BlazeFace",
      status: "stable",
      recommended: false,
      features: [
        "Local face detection",
        "Real-time face tracking",
        "Multiple face detection",
        "Offline capability",
        "Custom face recognition service",
        "Live camera preview with annotations"
      ],
      pros: [
        "Works completely offline",
        "No third-party dependencies",
        "Full control over data",
        "Real-time face tracking display",
        "No usage limits"
      ],
      cons: [
        "Requires model downloads",
        "Lower accuracy in poor lighting",
        "More complex setup",
        "Requires custom recognition service"
      ]
    },
    {
      title: "Face-API.js Recognition",
      description: "Advanced face recognition using face-api.js with SSD MobileNet V1 model",
      route: "/dashboard/face-scan-faceapi",
      icon: mdiFaceRecognition,
      technology: "Face-API.js + SSD MobileNet V1",
      status: "new",
      recommended: true,
      features: [
        "High-accuracy face detection",
        "Face landmark detection",
        "Automatic enrollment from photos",
        "Advanced face descriptors",
        "Built-in face matching",
        "Real-time recognition"
      ],
      pros: [
        "Higher recognition accuracy",
        "Can use existing student photos",
        "More robust face matching",
        "Built-in anti-spoofing features",
        "Professional-grade algorithms"
      ],
      cons: [
        "Larger model files",
        "Slightly higher resource usage",
        "Requires model downloads",
        "More complex facial analysis"
      ]
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            New
          </span>
        );
      case 'stable':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Stable
          </span>
        );
      case 'legacy':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            Legacy
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <CardBox>
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="text-xl font-semibold text-blue-800 mb-3">
            Choose Your Face Attendance System
          </h3>
          <p className="text-blue-700 mb-4">
            We offer two local face recognition systems for attendance tracking. Both work offline 
            and provide full data control, but with different strengths and capabilities.
          </p>
          <div className="bg-blue-100 p-4 rounded-lg">
            <p className="text-blue-800 text-sm">
              <strong>Recommendation:</strong> Try the Face-API.js system first as it offers higher 
              accuracy and can automatically enroll students using their existing photos. The TensorFlow 
              system is great for simpler setups or custom integrations.
            </p>
          </div>
        </div>
      </CardBox>

      {/* System Options */}
      <div className="grid lg:grid-cols-2 gap-6">
        {faceSystemOptions.map((option, index) => (
          <CardBox key={index} className={`relative ${option.recommended ? 'ring-2 ring-green-500' : ''}`}>
            {option.recommended && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Recommended
                </span>
              </div>
            )}
            
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-lg ${
                    option.recommended ? 'bg-green-100' : 'bg-blue-100'
                  }`}>
                    <Icon 
                      path={option.icon} 
                      className={`w-6 h-6 ${
                        option.recommended ? 'text-green-600' : 'text-blue-600'
                      }`} 
                    />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold">{option.title}</h4>
                    <p className="text-sm text-gray-600">{option.technology}</p>
                  </div>
                </div>
                {getStatusBadge(option.status)}
              </div>

              {/* Description */}
              <p className="text-gray-700 mb-4">{option.description}</p>

              {/* Features */}
              <div className="mb-4">
                <h5 className="font-medium text-gray-900 mb-2">Key Features:</h5>
                <ul className="text-sm text-gray-600 space-y-1">
                  {option.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      <Icon path={mdiShieldCheck} className="w-4 h-4 text-green-500 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pros and Cons */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <h6 className="text-sm font-medium text-green-700 mb-2">Advantages:</h6>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {option.pros.map((pro, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-green-500 mr-1">+</span>
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h6 className="text-sm font-medium text-red-700 mb-2">Considerations:</h6>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {option.cons.map((con, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-red-500 mr-1">-</span>
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <Link href={option.route}>
                <button className={`w-full px-6 py-3 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition duration-150 ease-in-out ${
                  option.recommended
                    ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-400'
                    : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400'
                }`}>
                  Use {option.title}
                </button>
              </Link>
            </div>
          </CardBox>
        ))}
      </div>

      {/* Comparison Table */}
      <CardBox>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Comparison</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Feature
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Face-API.js
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    TensorFlow/BlazeFace
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Recognition Accuracy
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">High</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">Good</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Photo Enrollment
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">Automatic</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">Manual Only</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Model Size
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">~15MB</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">~2MB</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Setup Complexity
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">Low</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">Medium</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Face Landmarks
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">68 Points</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">Basic</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Internet Required
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">No</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">No</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </CardBox>

      {/* Usage Guidelines */}
      <CardBox>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Usage Guidelines</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-green-700 mb-2">Choose Face-API.js when:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• You want the highest recognition accuracy</li>
                <li>• Students have existing photos to enroll from</li>
                <li>• You need professional-grade face analysis</li>
                <li>• You want easier enrollment process</li>
                <li>• You need advanced face landmarks</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-700 mb-2">Choose TensorFlow/BlazeFace when:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• You need minimal resource usage</li>
                <li>• You prefer real-time face tracking display</li>
                <li>• You want faster model loading</li>
                <li>• You need custom recognition service integration</li>
                <li>• You have limited storage space</li>
              </ul>
            </div>
          </div>
        </div>
      </CardBox>
    </div>
  );
};

export default function FaceAttendanceSelectorPage() {
  return (
    <>
      <Head>
        <title>{getPageTitle('Face Attendance Systems')}</title>
      </Head>
      <SectionMain>
        <SectionTitleLineWithButton 
          icon={mdiFaceRecognition} 
          title="Face Attendance Systems" 
          main 
        />
        <FaceAttendanceSelector />
      </SectionMain>
    </>
  );
}
