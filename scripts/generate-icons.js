#!/usr/bin/env node
/**
 * 아이콘 생성 스크립트
 * 256x256 PNG 이미지로부터 여러 크기의 아이콘을 생성합니다.
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ICON_SIZES = [16, 32, 48, 64, 128, 256];
const SOURCE_ICON = path.join(__dirname, '../src/assets/icons/icon.png');
const OUTPUT_DIR = path.join(__dirname, '../src/assets/icons');

async function generateIcons() {
  console.log('🎨 아이콘 생성 시작...');

  // 원본 PNG 파일이 있는지 확인
  if (!fs.existsSync(SOURCE_ICON)) {
    console.log('⚠️  원본 아이콘 파일이 없습니다.');
    console.log('💡 기존 ico 파일에서 PNG를 추출합니다...');
    
    // ICO 파일이 있다면 그것을 사용
    const icoPath = path.join(OUTPUT_DIR, 'icon.ico');
    if (fs.existsSync(icoPath)) {
      console.log('✅ 기존 ICO 파일을 사용합니다.');
      return;
    }
    
    console.error('❌ 아이콘 파일을 찾을 수 없습니다.');
    process.exit(1);
  }

  // 출력 디렉토리 생성
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    // 각 크기별 PNG 생성
    for (const size of ICON_SIZES) {
      await sharp(SOURCE_ICON)
        .resize(size, size, {
          kernel: sharp.kernel.lanczos3,
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .toFile(path.join(OUTPUT_DIR, `icon-${size}x${size}.png`));
      
      console.log(`✅ ${size}x${size} 아이콘 생성 완료`);
    }

    // macOS icns를 위한 추가 크기
    const macSizes = [512, 1024];
    for (const size of macSizes) {
      await sharp(SOURCE_ICON)
        .resize(size, size, {
          kernel: sharp.kernel.lanczos3,
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .toFile(path.join(OUTPUT_DIR, `icon-${size}x${size}.png`));
      
      console.log(`✅ ${size}x${size} 아이콘 생성 완료 (macOS)`);
    }

    console.log('✨ 모든 아이콘 생성 완료!');
    console.log('');
    console.log('📌 다음 단계:');
    console.log('1. png-to-ico 도구를 사용하여 Windows ICO 파일 생성:');
    console.log('   npm install -g png-to-ico');
    console.log(`   png-to-ico ${OUTPUT_DIR}/icon-256x256.png > ${OUTPUT_DIR}/icon.ico`);
    console.log('');
    console.log('2. macOS ICNS 파일은 electron-builder가 자동으로 생성합니다.');

  } catch (error) {
    console.error('❌ 아이콘 생성 중 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
generateIcons();