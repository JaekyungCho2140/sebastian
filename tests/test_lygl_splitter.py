"""LY/GL 분할 테스트"""
import os
import tempfile
import shutil
import pytest
import pandas as pd
from openpyxl import Workbook


class TestLYGLSplitter:
    """LYGLSplitter 클래스 테스트"""

    @pytest.fixture
    def temp_merged_file(self):
        """테스트용 병합 파일"""
        temp_dir = tempfile.mkdtemp()
        merged_file = os.path.join(temp_dir, "251104_StringALL.xlsx")

        # PRD 5.1.3: 병합 파일 헤더 구조
        wb = Workbook()
        ws = wb.active

        # 헤더
        ws.append(["Table", "KEY", "Source", "Target_EN", "Target_CT", "Target_CS",
                  "Target_JA", "Target_TH", "Target_PT-BR", "Target_RU", "Status", "NOTE"])

        # 데이터 (2개 행)
        ws.append(["TABLE1", "KEY001", "Hello", "Hello_EN", "Hello_CT", "Hello_CS",
                  "Hello_JA", "Hello_TH", "Hello_PT-BR", "Hello_RU", "Translated", "Note1"])
        ws.append(["TABLE2", "KEY002", "World", "World_EN", "World_CT", "World_CS",
                  "World_JA", "World_TH", "World_PT-BR", "World_RU", "Translated", "Note2"])

        wb.save(merged_file)
        wb.close()

        yield temp_dir, merged_file
        shutil.rmtree(temp_dir, ignore_errors=True)

    def test_split_lygl_creates_7_language_files(self, temp_merged_file):
        """7개 언어별 파일을 생성해야 함"""
        from src.lygl_splitter import LYGLSplitter

        temp_dir, merged_file = temp_merged_file
        output_dir = os.path.join(temp_dir, "output")
        os.makedirs(output_dir)

        splitter = LYGLSplitter()
        result = splitter.split_lygl(merged_file, output_dir)

        assert result["success"] is True, f"분할이 성공해야 합니다. 에러: {result.get('error', 'Unknown')}"
        assert len(result["output_files"]) == 7, "7개 파일이 생성되어야 합니다"

    def test_split_lygl_creates_correct_file_structure(self, temp_merged_file):
        """각 언어 파일이 올바른 헤더 구조를 가져야 함"""
        from src.lygl_splitter import LYGLSplitter

        temp_dir, merged_file = temp_merged_file
        output_dir = os.path.join(temp_dir, "output")
        os.makedirs(output_dir)

        splitter = LYGLSplitter()
        result = splitter.split_lygl(merged_file, output_dir)

        # PRD 5.2.3: 개별 파일 헤더 확인
        for output_file in result["output_files"]:
            df = pd.read_excel(output_file)
            required_headers = ["Table", "KEY", "Source", "Target", "Status", "NOTE"]
            for header in required_headers:
                assert header in df.columns, f"{header} 헤더가 있어야 합니다"

    def test_split_lygl_generates_correct_filenames(self, temp_merged_file):
        """출력 파일명이 {date}_{lang}.xlsx 형식이어야 함"""
        from src.lygl_splitter import LYGLSplitter

        temp_dir, merged_file = temp_merged_file
        output_dir = os.path.join(temp_dir, "output")
        os.makedirs(output_dir)

        splitter = LYGLSplitter()
        result = splitter.split_lygl(merged_file, output_dir)

        # PRD 5.2.3: 파일명 형식 검증
        expected_filenames = [
            "251104_EN.xlsx", "251104_CT.xlsx", "251104_CS.xlsx",
            "251104_JA.xlsx", "251104_TH.xlsx", "251104_PT-BR.xlsx", "251104_RU.xlsx"
        ]

        actual_filenames = [os.path.basename(f) for f in result["output_files"]]

        for expected in expected_filenames:
            assert expected in actual_filenames, f"{expected} 파일이 생성되어야 합니다"

    def test_split_lygl_extracts_correct_target_values(self, temp_merged_file):
        """각 언어 파일에 올바른 Target 값이 추출되어야 함"""
        from src.lygl_splitter import LYGLSplitter

        temp_dir, merged_file = temp_merged_file
        output_dir = os.path.join(temp_dir, "output")
        os.makedirs(output_dir)

        splitter = LYGLSplitter()
        result = splitter.split_lygl(merged_file, output_dir)

        # EN 파일 확인
        en_file = [f for f in result["output_files"] if "EN.xlsx" in f][0]
        en_df = pd.read_excel(en_file)

        assert en_df["Target"].iloc[0] == "Hello_EN", "EN Target 값이 일치해야 합니다"
        assert en_df["Target"].iloc[1] == "World_EN", "EN Target 값이 일치해야 합니다"

        # CT 파일 확인
        ct_file = [f for f in result["output_files"] if "CT.xlsx" in f][0]
        ct_df = pd.read_excel(ct_file)

        assert ct_df["Target"].iloc[0] == "Hello_CT", "CT Target 값이 일치해야 합니다"

    def test_split_lygl_auto_detects_date_prefix(self, temp_merged_file):
        """입력 파일명에서 날짜 접두사를 자동 추출해야 함"""
        from src.lygl_splitter import LYGLSplitter

        temp_dir, merged_file = temp_merged_file
        output_dir = os.path.join(temp_dir, "output")
        os.makedirs(output_dir)

        splitter = LYGLSplitter()
        result = splitter.split_lygl(merged_file, output_dir)

        # 모든 파일이 251104로 시작해야 함
        for output_file in result["output_files"]:
            filename = os.path.basename(output_file)
            assert filename.startswith("251104_"), f"파일명이 251104_로 시작해야 합니다: {filename}"

    def test_split_lygl_accepts_custom_date_prefix(self):
        """사용자 지정 날짜 접두사를 사용할 수 있어야 함"""
        from src.lygl_splitter import LYGLSplitter
        import tempfile

        temp_dir = tempfile.mkdtemp()

        try:
            # 병합 파일 생성
            merged_file = os.path.join(temp_dir, "test_StringALL.xlsx")
            wb = Workbook()
            ws = wb.active
            ws.append(["Table", "KEY", "Source", "Target_EN", "Target_CT", "Target_CS",
                      "Target_JA", "Target_TH", "Target_PT-BR", "Target_RU", "Status", "NOTE"])
            ws.append(["TABLE1", "KEY001", "Hello", "Hello_EN", "Hello_CT", "Hello_CS",
                      "Hello_JA", "Hello_TH", "Hello_PT-BR", "Hello_RU", "Translated", "Note1"])
            wb.save(merged_file)
            wb.close()

            output_dir = os.path.join(temp_dir, "output")
            os.makedirs(output_dir)

            splitter = LYGLSplitter()
            result = splitter.split_lygl(merged_file, output_dir, date_prefix="250101")

            # 모든 파일이 250101로 시작해야 함
            for output_file in result["output_files"]:
                filename = os.path.basename(output_file)
                assert filename.startswith("250101_"), f"파일명이 250101_로 시작해야 합니다: {filename}"

        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)
