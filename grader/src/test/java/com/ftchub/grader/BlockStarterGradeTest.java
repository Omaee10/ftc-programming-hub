package com.ftchub.grader;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ftchub.grader.api.CompileRequest;
import com.ftchub.grader.api.GradedResultJson;
import com.ftchub.grader.compile.InMemoryCompiler;
import com.ftchub.grader.compile.StubLoader;
import com.ftchub.grader.grade.Grader;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Grades Blockly starter Java emitted by {@code npm run test:blockly}.
 * Manifest: grader/build/blockly-smoke/manifest.json
 */
class BlockStarterGradeTest {

    private static Grader grader;
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Path MANIFEST =
            Path.of("build", "blockly-smoke", "manifest.json");

    /** Starters that must compile and not grade {@code wrong} (complete lesson scaffolds). */
    private static final Set<Integer> GOLDEN_STARTER_IDS = Set.of(1, 2, 6, 22);

    @BeforeAll
    static void setUp() throws Exception {
        StubLoader stubs = new StubLoader();
        stubs.compile();
        grader = new Grader(new InMemoryCompiler(stubs));
    }

    static boolean manifestExists() {
        return Files.exists(MANIFEST);
    }

    @Test
    @EnabledIf("manifestExists")
    void blocklyStarters_allCompile() throws Exception {
        for (Map<String, Object> entry : readManifest()) {
            int challengeId = ((Number) entry.get("challengeId")).intValue();
            String code = (String) entry.get("code");
            GradedResultJson result =
                    grader.grade(new CompileRequest(code, challengeId, List.of()));

            assertTrue(
                    result.syntaxIssues().stream().noneMatch(i -> "error".equals(i.severity())),
                    "Challenge " + challengeId + " starter has compile errors: " + result.syntaxIssues());
        }
    }

    @Test
    @EnabledIf("manifestExists")
    void blocklyGoldenStarters_notWrong() throws Exception {
        for (Map<String, Object> entry : readManifest()) {
            int challengeId = ((Number) entry.get("challengeId")).intValue();
            if (!GOLDEN_STARTER_IDS.contains(challengeId)) continue;

            String code = (String) entry.get("code");
            GradedResultJson result =
                    grader.grade(new CompileRequest(code, challengeId, List.of()));

            assertFalse(
                    result.syntaxIssues().stream().anyMatch(i -> "error".equals(i.severity())),
                    "Golden starter " + challengeId + " must compile");
            assertNotEquals(
                    "wrong",
                    result.grade(),
                    "Golden starter " + challengeId + " graded wrong: " + failures(result));
        }
    }

    private static List<Map<String, Object>> readManifest() throws Exception {
        String json = Files.readString(MANIFEST);
        List<Map<String, Object>> entries =
                MAPPER.readValue(json, new TypeReference<>() {});
        assertTrue(!entries.isEmpty(), "manifest must list at least one challenge");
        return entries;
    }

    @Test
    @EnabledIf("manifestExists")
    void challenge1_starter_hasNegatedStick() throws Exception {
        String json = Files.readString(MANIFEST);
        List<Map<String, Object>> entries =
                MAPPER.readValue(json, new TypeReference<>() {});

        String ch1 =
                entries.stream()
                        .filter(e -> ((Number) e.get("challengeId")).intValue() == 1)
                        .map(e -> (String) e.get("code"))
                        .findFirst()
                        .orElse("");

        assertTrue(
                ch1.contains("-gamepad1.left_stick_y"),
                "Challenge 1 starter should use negated drive stick");
    }

    @Test
    @EnabledIf("manifestExists")
    void challenge2_starter_encoderMacroOrder() throws Exception {
        String json = Files.readString(MANIFEST);
        List<Map<String, Object>> entries =
                MAPPER.readValue(json, new TypeReference<>() {});

        String ch2 =
                entries.stream()
                        .filter(e -> ((Number) e.get("challengeId")).intValue() == 2)
                        .map(e -> (String) e.get("code"))
                        .findFirst()
                        .orElse("");

        assertTrue(ch2.contains("STOP_AND_RESET_ENCODER"), "ch2 reset encoder");
        assertTrue(
                ch2.indexOf("setTargetPosition") < ch2.indexOf("RUN_TO_POSITION"),
                "ch2 target before RUN_TO_POSITION");
        assertTrue(ch2.contains("setPower(0)"), "ch2 stops motor after move");
    }

    private static String failures(GradedResultJson result) {
        StringBuilder sb = new StringBuilder();
        if (!result.syntaxIssues().isEmpty()) {
            sb.append(" syntax: ").append(result.syntaxIssues());
        }
        result.universalResults().stream()
                .filter(r -> !r.pass())
                .forEach(r -> sb.append(" universal/").append(r.tier()).append(": ").append(r.label()));
        result.requiredResults().stream()
                .filter(r -> !r.pass())
                .forEach(r -> sb.append(" required: ").append(r.label()));
        result.improvementResults().stream()
                .filter(r -> !r.pass())
                .forEach(r -> sb.append(" challenge/improvement: ").append(r.label()));
        return sb.toString();
    }
}
