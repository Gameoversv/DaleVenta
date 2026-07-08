package rd.dalventa.api.product.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.product.domain.Category;
import rd.dalventa.api.product.dto.CategoryResponse;
import rd.dalventa.api.product.dto.CreateCategoryRequest;
import rd.dalventa.api.product.repository.CategoryRepository;
import rd.dalventa.api.shared.domain.TenantContext;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CategoryService {

    public static final String GENERAL_CATEGORY_NAME = "General";

    private final CategoryRepository categoryRepository;

    @Transactional
    public CategoryResponse create(CreateCategoryRequest req) {
        var category = new Category(req.name());
        category.setTenantId(TenantContext.require());
        return CategoryResponse.from(categoryRepository.save(category));
    }

    @Transactional
    public List<CategoryResponse> list() {
        var tenantId = TenantContext.require();
        ensureGeneralCategory(tenantId);
        return categoryRepository.findAllByTenantIdAndActiveTrue(tenantId)
                .stream().map(CategoryResponse::from).toList();
    }

    @Transactional
    public Category ensureGeneralCategory(UUID tenantId) {
        var existing = categoryRepository.findByTenantIdAndNameIgnoreCase(tenantId, GENERAL_CATEGORY_NAME).orElse(null);
        if (existing != null) {
            if (!existing.isActive()) {
                existing.setActive(true);
                return categoryRepository.save(existing);
            }
            return existing;
        }
        var category = new Category(GENERAL_CATEGORY_NAME);
        category.setTenantId(tenantId);
        return categoryRepository.save(category);
    }
}
