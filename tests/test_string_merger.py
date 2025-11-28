"""M4/GL STRING 병합 테스트"""
import os
import tempfile
import shutil
import pytest
import pandas as pd
from openpyxl import Workbook


class TestStringMerger:
    """StringMerger 클래스 테스트"""

    @pytest.fixture
    def temp_dir_with_files(self):
        """테스트용 8개 STRING Excel 파일이 있는 임시 디렉토리"""
        temp_dir = tempfile.mkdtemp()

        # 8개 파일 생성 (간단한 구조)
        # (filename, header_row, data_start_row, [String ID, NOTE, KO, EN, CT, CS, JA, TH, ES-LATAM, PT-BR])
        files = [
            ("SEQUENCE_DIALOGUE.xlsm", 1, 8, [7, None, 10, 11, 12, 13, 14, 15, 16, 17]),
            ("STRING_BUILTIN.xlsm", 1, 3, [7, 21, 8, 9, 10, 11, 12, 13, 14, 15]),
            ("STRING_MAIL.xlsm", 1, 3, [7, None, 8, 9, 10, 11, 12, 13, 14, 15]),
            ("STRING_MESSAGE.xlsm", 1, 3, [7, 21, 8, 9, 10, 11, 12, 13, 14, 15]),
            ("STRING_NPC.xlsm", 1, 3, [7, 20, 9, 10, 11, 12, 13, 14, 15, 16]),
            ("STRING_QUESTTEMPLATE.xlsm", 1, 6, [7, 0, 12, 13, 14, 15, 16, 17, 18, 19]),
            ("STRING_TEMPLATE.xlsm", 1, 3, [7, 19, 8, 9, 10, 11, 12, 13, 14, 15]),
            ("STRING_TOOLTIP.xlsm", 1, 3, [7, 8, 11, 12, 13, 14, 15, 16, 17, 18]),
        ]

        for filename, header_row, data_start_row, indices in files:
            file_path = os.path.join(temp_dir, filename)
            wb = Workbook()
            ws = wb.active

            # 헤더 행
            for _ in range(header_row):
                ws.append([None] * 25)

            # 헤더 생성
            header = [""] * 25
            header[indices[0]] = "String ID"
            if indices[1] is not None:
                header[indices[1]] = "NOTE"
            header[indices[2]] = "KO"
            header[indices[3]] = "EN"
            if len(indices) > 4:
                header[indices[4]] = "CT"
                header[indices[5]] = "CS"
                header[indices[6]] = "JA"
                header[indices[7]] = "TH"
                header[indices[8]] = "ES-LATAM"
                header[indices[9]] = "PT-BR"
            ws.append(header)

            # 빈 행
            for _ in range(data_start_row - header_row - 1):
                ws.append([None] * 25)

            # 데이터 행
            data_row = [""] * 25
            data_row[indices[0]] = "1001"
            if indices[1] is not None:
                data_row[indices[1]] = "테스트 노트"
            data_row[indices[2]] = "한국어"
            data_row[indices[3]] = "English"
            if len(indices) > 4:
                data_row[indices[4]] = "繁體中文"
                data_row[indices[5]] = "简体中文"
                data_row[indices[6]] = "日本語"
                data_row[indices[7]] = "ภาษาไทย"
                data_row[indices[8]] = "Español"
                data_row[indices[9]] = "Português"
            ws.append(data_row)

            wb.save(file_path)
            wb.close()

        yield temp_dir
        shutil.rmtree(temp_dir, ignore_errors=True)

    def test_read_all_files_loads_8_files(self, temp_dir_with_files):
        """8개 STRING 파일을 읽어야 함"""
        from src.string_merger import StringMerger

        merger = StringMerger()
        result = merger.merge_string(temp_dir_with_files)

        assert result["success"] is True, f"병합이 성공해야 합니다. 에러: {result.get('error', 'Unknown')}"
        assert "output_file" in result, "결과에 output_file이 있어야 합니다"
        assert result["row_count"] >= 8, "최소 8개 행이 병합되어야 합니다 (각 파일당 1행씩)"

    def test_merge_string_creates_correct_output_structure(self, temp_dir_with_files):
        """STRING 병합 결과가 올바른 구조를 가져야 함"""
        from src.string_merger import StringMerger

        merger = StringMerger()
        result = merger.merge_string(temp_dir_with_files)

        # 출력 파일 확인
        output_df = pd.read_excel(result["output_file"])

        # 필수 헤더 확인
        required_headers = ["#", "Table Name", "String ID", "Table/ID", "NOTE", "KO", "EN"]
        for header in required_headers:
            assert header in output_df.columns, f"{header} 헤더가 있어야 합니다"

    def test_merge_string_preserves_table_name(self, temp_dir_with_files):
        """각 파일명이 Table Name으로 저장되어야 함"""
        from src.string_merger import StringMerger

        merger = StringMerger()
        result = merger.merge_string(temp_dir_with_files)

        # 출력 파일 확인
        output_df = pd.read_excel(result["output_file"])

        # Table Name 확인 (파일명에서 .xlsm 제거한 값)
        table_names = output_df["Table Name"].unique()
        assert "SEQUENCE_DIALOGUE" in table_names, "SEQUENCE_DIALOGUE가 Table Name에 있어야 합니다"
        assert "STRING_BUILTIN" in table_names, "STRING_BUILTIN이 Table Name에 있어야 합니다"

    def test_merge_string_validates_required_files(self):
        """필수 파일이 누락되면 에러를 반환해야 함"""
        from src.string_merger import StringMerger
        import tempfile

        # 빈 디렉토리
        temp_dir = tempfile.mkdtemp()

        try:
            merger = StringMerger()
            result = merger.merge_string(temp_dir)

            assert result["success"] is False, "파일이 없으면 실패해야 합니다"
            assert "필요한 파일이 누락되었습니다" in result["error"], "누락 파일 에러 메시지가 있어야 합니다"
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)
