"""M4/GL 통합 병합 (DIALOGUE + STRING)"""
from src.dialogue_merger import DialogueMerger
from src.string_merger import StringMerger


class M4GLMerger:
    """M4/GL DIALOGUE + STRING 통합 병합 클래스"""

    def __init__(self):
        """M4GLMerger 초기화"""
        self.dialogue_merger = DialogueMerger()
        self.string_merger = StringMerger()

    def merge_all(self, folder_path):
        """DIALOGUE와 STRING을 순차적으로 병합

        Args:
            folder_path: DIALOGUE 및 STRING 파일이 있는 폴더 경로

        Returns:
            dict: 통합 병합 결과
                - success: 전체 성공 여부
                - dialogue_result: DIALOGUE 병합 결과
                - string_result: STRING 병합 결과
                - total_rows: 총 행 수
                - error: 에러 메시지 (실패 시)
        """
        try:
            # 1. DIALOGUE 병합 실행
            dialogue_result = self.dialogue_merger.merge_dialogue(folder_path)

            if not dialogue_result["success"]:
                return {
                    "success": False,
                    "error": f"DIALOGUE 병합 실패: {dialogue_result.get('error', 'Unknown')}"
                }

            # 2. STRING 병합 실행
            string_result = self.string_merger.merge_string(folder_path)

            if not string_result["success"]:
                return {
                    "success": False,
                    "error": f"STRING 병합 실패: {string_result.get('error', 'Unknown')}",
                    "dialogue_result": dialogue_result  # DIALOGUE는 성공했으므로 결과 포함
                }

            # 3. 통합 결과 반환
            total_rows = dialogue_result["row_count"] + string_result["row_count"]

            return {
                "success": True,
                "dialogue_result": dialogue_result,
                "string_result": string_result,
                "total_rows": total_rows
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
