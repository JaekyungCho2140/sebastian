/**
 * 빌드된 실행 파일의 무결성을 검증하는 스크립트
 * 파일 존재, 크기, 기본 구조 등을 확인
 */

const fs = require('fs');
const path = require('path');

console.log('빌드 검증 시작...\n');

// 검증할 파일 목록
const filesToVerify = [
  {
    path: 'dist/Sebastian 0.2.0.exe',
    minSize: 100 * 1024 * 1024, // 최소 100MB
    type: '포터블 실행 파일'
  },
  {
    path: 'dist/Sebastian Setup 0.2.0.exe',
    minSize: 100 * 1024 * 1024, // 최소 100MB
    type: 'NSIS 설치 프로그램'
  },
  {
    path: 'dist/win-unpacked/Sebastian.exe',
    minSize: 100 * 1024, // 최소 100KB
    type: '압축 해제된 실행 파일'
  }
];

// 필수 리소스 파일 확인
const requiredResources = [
  'dist/win-unpacked/resources/app.asar',
  'dist/win-unpacked/chrome_100_percent.pak',
  'dist/win-unpacked/ffmpeg.dll'
];

let allValid = true;

// 빌드 파일 검증
console.log('=== 빌드 파일 검증 ===');
filesToVerify.forEach(file => {
  const fullPath = path.join(__dirname, file.path);
  
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ ${file.type} 없음: ${file.path}`);
    allValid = false;
    return;
  }
  
  const stats = fs.statSync(fullPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  if (stats.size < file.minSize) {
    console.error(`❌ ${file.type} 크기 부족: ${sizeMB}MB (최소 ${(file.minSize / (1024 * 1024)).toFixed(0)}MB 필요)`);
    allValid = false;
  } else {
    console.log(`✅ ${file.type}: ${sizeMB}MB`);
  }
});

// 리소스 파일 검증
console.log('\n=== 리소스 파일 검증 ===');
requiredResources.forEach(resource => {
  const fullPath = path.join(__dirname, resource);
  
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ 리소스 없음: ${resource}`);
    allValid = false;
  } else {
    console.log(`✅ ${resource}`);
  }
});

// app.asar 내용 확인 (크기만)
const appAsarPath = path.join(__dirname, 'dist/win-unpacked/resources/app.asar');
if (fs.existsSync(appAsarPath)) {
  const asarStats = fs.statSync(appAsarPath);
  const asarSizeMB = (asarStats.size / (1024 * 1024)).toFixed(2);
  console.log(`\n=== app.asar 정보 ===`);
  console.log(`크기: ${asarSizeMB}MB`);
  
  if (asarStats.size < 1024 * 1024) { // 1MB 미만이면 문제
    console.error('❌ app.asar 크기가 너무 작음');
    allValid = false;
  }
}

// 최종 결과
console.log('\n=== 검증 결과 ===');
if (allValid) {
  console.log('✅ 빌드 검증 성공!');
  process.exit(0);
} else {
  console.error('❌ 빌드 검증 실패!');
  process.exit(1);
}